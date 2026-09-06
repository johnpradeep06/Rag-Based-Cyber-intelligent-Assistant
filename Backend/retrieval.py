"""
retrieval.py — opt-in retrieval pipeline: query construction + query translation
+ hybrid retrieval + rerank + a corrective (CRAG) gate.

EVERYTHING here is gated by env flags and defaults to OFF. With RETRIEVAL_V2
unset/false, rag_pipeline.retrieve_context_docs() runs its original code and this
module is never touched at request time. Each sub-step also fails soft: any error
falls back to the next-simplest behaviour, never to an exception.

Env flags
---------
  RETRIEVAL_V2=false            master switch (read in rag_pipeline, not here)
  EMBEDDING_MODEL=openai/text-embedding-ada-002
  CHROMA_PERSIST_DIR_V2=        set TOGETHER with a non-default EMBEDDING_MODEL to
                               read a parallel collection; else the live one is reused
  RERANK_ENABLED=false
  RERANK_URL=https://openrouter.ai/api/v1/rerank
  RERANK_MODEL=nvidia/llama-nemotron-rerank-vl-1b-v2:free   (confirm the id before enabling)
  RERANK_TIMEOUT=3
  RERANK_SCORE_FLOOR=0          CRAG gate on the rerank score. 0 = off (default): the
                               llama-nemotron reranker returns tiny uncalibrated
                               scores (~0.15 for a good hit), so the "weak context"
                               decision stays on the dense similarity score. Set a
                               small positive floor only after tuning on real queries.
  MULTI_QUERY_ENABLED=false
  DENSE_K=20  BM25_K=20  FINAL_K=5
"""
import os
import re

from dotenv import load_dotenv

load_dotenv()  # tolerate being imported before rag_pipeline

_KEY = os.getenv("OPENROUTER_API_KEY")
_BASE = "https://openrouter.ai/api/v1"
_DEFAULT_EMB = "openai/text-embedding-ada-002"
_DEFAULT_RERANK = "nvidia/llama-nemotron-rerank-vl-1b-v2:free"
_GEN = "openai/gpt-oss-120b"


def _flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


# ---------------------------------------------------------------------------
# vector store  (live collection reused unless a parallel v2 dir is configured)
# ---------------------------------------------------------------------------
_VS = None


def _get_vectorstore():
    global _VS
    if _VS is not None:
        return _VS
    v2_dir = os.getenv("CHROMA_PERSIST_DIR_V2")
    model = os.getenv("EMBEDDING_MODEL", _DEFAULT_EMB)
    if v2_dir and model != _DEFAULT_EMB:
        from langchain_openai import OpenAIEmbeddings
        from langchain_community.vectorstores import Chroma
        emb = OpenAIEmbeddings(
            api_key=_KEY, base_url=_BASE, model=model,
            # non-OpenAI model: skip tiktoken ctx trimming, send raw text
            check_embedding_ctx_length=False,
        )
        _VS = Chroma(persist_directory=v2_dir, embedding_function=emb)
    else:
        from rag_pipeline import vectorstore as _live
        _VS = _live
    return _VS


def _relevance_threshold() -> float:
    try:
        from rag_pipeline import RELEVANCE_THRESHOLD
        return float(RELEVANCE_THRESHOLD)
    except Exception:
        return 0.15


# ---------------------------------------------------------------------------
# BM25 lexical index  (built once from the collection, invalidated on writes)
# ---------------------------------------------------------------------------
_TOK = re.compile(r"[a-z0-9][a-z0-9._\-]*")
_BM25 = None  # (BM25Okapi, list[Document])


def _tokenize(text: str):
    return _TOK.findall((text or "").lower())


def _bm25_index():
    global _BM25
    if _BM25 is not None:
        return _BM25
    from rank_bm25 import BM25Okapi
    from langchain_core.documents import Document
    got = _get_vectorstore().get()  # {'ids','documents','metadatas'}
    docs = [
        Document(page_content=d or "", metadata=m or {})
        for d, m in zip(got.get("documents", []), got.get("metadatas", []))
        if (d or "").strip()
    ]
    corpus = [_tokenize(d.page_content) for d in docs] or [[""]]
    _BM25 = (BM25Okapi(corpus), docs)
    return _BM25


def reset_bm25():
    """Called by rag_pipeline after any add/delete so the next search rebuilds."""
    global _BM25
    _BM25 = None


def _bm25_search(query: str, k: int):
    try:
        bm, docs = _bm25_index()
    except Exception as e:
        print(f"[retrieval] bm25 unavailable: {e}")
        return []
    if not docs:
        return []
    scores = bm.get_scores(_tokenize(query))
    order = sorted(range(len(docs)), key=lambda i: scores[i], reverse=True)
    return [docs[i] for i in order[:k] if scores[i] > 0]


# ---------------------------------------------------------------------------
# dense retrieval + Reciprocal Rank Fusion
# ---------------------------------------------------------------------------
def _dense(query: str, k: int, where=None):
    vs = _get_vectorstore()
    try:
        return vs.similarity_search_with_relevance_scores(query, k=k, filter=where)
    except TypeError:
        return vs.similarity_search_with_relevance_scores(query, k=k)
    except Exception as e:
        print(f"[retrieval] dense search failed: {e}")
        return []


def _doc_key(d):
    m = d.metadata or {}
    return (m.get("ref"), m.get("page"), (d.page_content or "")[:80])


def _rrf(ranked_lists, k: int, c: int = 60):
    """Merge several ranked [Document] lists. Doc score = sum 1/(c + rank)."""
    score, keep = {}, {}
    for lst in ranked_lists:
        for rank, d in enumerate(lst):
            kk = _doc_key(d)
            score[kk] = score.get(kk, 0.0) + 1.0 / (c + rank + 1)
            keep.setdefault(kk, d)
    return sorted(keep.values(), key=lambda d: score[_doc_key(d)], reverse=True)[:k]


# ---------------------------------------------------------------------------
# query construction — cheap heuristic "self-query" (no LLM call)
# ---------------------------------------------------------------------------
_CVE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.I)
_TID = re.compile(r"\bT\d{4}(?:\.\d{3})?\b")
_TYPE_WORDS = [
    (re.compile(r"\bkev\b|known[- ]exploited", re.I), "kev"),
    (re.compile(r"\badvisor(?:y|ies)\b", re.I), "advisory"),
    (re.compile(r"\bmitre\b|att&ck|attack techniques?", re.I), "attack"),
    (re.compile(r"\bgithub\b|\brepo(?:sitory)?\b", re.I), "github"),
]


def _self_query(question: str):
    """Return (where_filter | None, (metadata_field, exact_value) | None)."""
    m = _CVE.search(question)
    if m:
        return None, ("cve_id", m.group(0).upper())
    m = _TID.search(question)
    if m:
        return None, ("technique_id", m.group(0).upper())
    for rx, val in _TYPE_WORDS:
        if rx.search(question):
            return {"source_type": val}, None
    return None, None


def _exact_fetch(field: str, value: str, k: int):
    from langchain_core.documents import Document
    try:
        got = _get_vectorstore().get(where={field: value})
    except Exception:
        return []
    docs = [
        Document(page_content=d or "", metadata=m or {})
        for d, m in zip(got.get("documents", []), got.get("metadatas", []))
    ]
    return docs[:k]


# ---------------------------------------------------------------------------
# query translation — multi-query + one CRAG rewrite  (LLM, best-effort)
# ---------------------------------------------------------------------------
_LLM = None


def _llm():
    global _LLM
    if _LLM is None:
        from openai import OpenAI
        _LLM = OpenAI(api_key=_KEY, base_url=_BASE)
    return _LLM


def _multi_query(question: str):
    try:
        r = _llm().chat.completions.create(
            model=_GEN, max_tokens=180, temperature=0.7,
            messages=[{"role": "user", "content":
                       "Give 3 alternative phrasings of this security question, "
                       "one per line, no numbering or commentary:\n\n" + question}],
        )
        lines = [ln.strip("-*• \t") for ln in (r.choices[0].message.content or "").splitlines()]
        return [ln for ln in lines if ln][:3]
    except Exception as e:
        print(f"[retrieval] multi-query off: {e}")
        return []


def _rewrite(question: str):
    try:
        r = _llm().chat.completions.create(
            model=_GEN, max_tokens=60, temperature=0.0,
            messages=[{"role": "user", "content":
                       "Rewrite this as a single, more precise search query. "
                       "Output only the query:\n\n" + question}],
        )
        return (r.choices[0].message.content or "").strip() or question
    except Exception:
        return question


# ---------------------------------------------------------------------------
# rerank  (OpenRouter, additive, fails soft to input order)
# ---------------------------------------------------------------------------
def _rerank(query: str, docs):
    if not _flag("RERANK_ENABLED") or not docs:
        return docs, None
    import httpx
    try:
        resp = httpx.post(
            os.getenv("RERANK_URL", "https://openrouter.ai/api/v1/rerank"),
            headers={"Authorization": f"Bearer {_KEY}"},
            json={
                "model": os.getenv("RERANK_MODEL", _DEFAULT_RERANK),
                "query": query,
                "documents": [(d.page_content or "")[:4000] for d in docs],
                "top_n": len(docs),
            },
            timeout=float(os.getenv("RERANK_TIMEOUT", "3")),
        )
        resp.raise_for_status()
        results = resp.json().get("results") or []
        if not results:
            return docs, None
        ordered = [docs[x["index"]] for x in results
                   if isinstance(x.get("index"), int) and 0 <= x["index"] < len(docs)]
        return (ordered or docs), results[0].get("relevance_score")
    except Exception as e:
        print(f"[retrieval] rerank fell back to fusion order: {e}")
        return docs, None


# ---------------------------------------------------------------------------
# entrypoint
# ---------------------------------------------------------------------------
def retrieve(question: str, _retry: bool = False):
    """Drop-in for rag_pipeline.retrieve_context_docs: returns list[Document] or None."""
    dense_k = int(os.getenv("DENSE_K", "20"))
    bm25_k = int(os.getenv("BM25_K", "20"))
    final_k = int(os.getenv("FINAL_K", "5"))
    thr = _relevance_threshold()

    where, exact = _self_query(question)
    if exact:
        hits = _exact_fetch(exact[0], exact[1], final_k)
        if hits:
            return hits  # authoritative ID match — skip fusion/rerank

    dense_pairs = _dense(question, dense_k, where)
    best_dense = max([s for _, s in dense_pairs], default=0.0)
    lists = [[d for d, _ in dense_pairs], _bm25_search(question, bm25_k)]

    strong_hits = sum(1 for _, s in dense_pairs if s >= thr)
    if _flag("MULTI_QUERY_ENABLED") and strong_hits < 2:
        for vq in _multi_query(question):
            vp = _dense(vq, dense_k, where)
            lists.append([d for d, _ in vp])
            lists.append(_bm25_search(vq, bm25_k))
            best_dense = max(best_dense, max([s for _, s in vp], default=0.0))

    merged = _rrf(lists, dense_k)
    if not merged:
        return None

    ranked, top = _rerank(question, merged)

    # CRAG gate. Primary signal is the dense similarity score (trusted, same as the
    # baseline). The rerank score is uncalibrated per-model, so it only gates when
    # RERANK_SCORE_FLOOR is explicitly set > 0 after tuning.
    # ponytail: dense threshold assumes the ada score distribution; retune `thr`
    # (RELEVANCE_THRESHOLD) once the v2 embedder is live.
    floor = float(os.getenv("RERANK_SCORE_FLOOR", "0"))
    weak = best_dense < thr or (floor > 0 and top is not None and top < floor)
    if weak:
        if not _retry:
            return retrieve(_rewrite(question), _retry=True)
        return None

    return ranked[:final_k]


if __name__ == "__main__":
    from langchain_core.documents import Document
    a = Document(page_content="alpha", metadata={"ref": "a"})
    b = Document(page_content="bravo", metadata={"ref": "b"})
    out = _rrf([[a, b], [a, b], [b]], 2)
    assert out[0].metadata["ref"] == "b", out
    assert _tokenize("CVE-2024-3400 in KEV") == ["cve-2024-3400", "in", "kev"]
    assert _self_query("is CVE-2024-3400 exploited?")[1] == ("cve_id", "CVE-2024-3400")
    assert _self_query("mitre technique for phishing")[0] == {"source_type": "attack"}
    assert _self_query("what is a buffer overflow") == (None, None)
    print("ok")
