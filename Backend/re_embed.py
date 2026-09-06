"""
re_embed.py — copy the live Chroma collection into a NEW one that uses a
different embedding model. Read-only on the source; the running app is untouched.

Run from Backend/ :
    python re_embed.py --src ./chroma_db --dst ./chroma_db_v2 \
        --model nvidia/nemotron-3-embed-1b:free

Smoke test first with a small slice:
    python re_embed.py --limit 50 --dst ./chroma_db_smoke

Then switch the backend over by setting env vars (and nothing else):
    RETRIEVAL_V2=true
    EMBEDDING_MODEL=nvidia/nemotron-3-embed-1b:free
    CHROMA_PERSIST_DIR_V2=/absolute/path/to/chroma_db_v2
Roll back by clearing EMBEDDING_MODEL / CHROMA_PERSIST_DIR_V2.
"""
import argparse
import os
import time

from dotenv import load_dotenv

load_dotenv()


def main():
    ap = argparse.ArgumentParser()
    d = os.getenv("DATA_DIR", ".")
    ap.add_argument("--src", default=os.path.join(d, "chroma_db"))
    ap.add_argument("--dst", default=os.path.join(d, "chroma_db_v2"))
    ap.add_argument("--model",
                    default=os.getenv("EMBEDDING_MODEL_V2", "nvidia/nemotron-3-embed-1b:free"))
    ap.add_argument("--collection", default="langchain")
    ap.add_argument("--batch", type=int, default=100)
    ap.add_argument("--sleep", type=float, default=0.0, help="seconds between batches")
    ap.add_argument("--limit", type=int, default=0, help="stop after N chunks (smoke test)")
    args = ap.parse_args()

    key = os.environ["OPENROUTER_API_KEY"]
    base = "https://openrouter.ai/api/v1"

    import chromadb
    src = chromadb.PersistentClient(args.src).get_collection(args.collection)
    got = src.get(include=["documents", "metadatas"])
    pairs = [(doc, meta or {}) for doc, meta in zip(got["documents"], got["metadatas"])
             if (doc or "").strip()]
    if args.limit:
        pairs = pairs[:args.limit]
    total = len(pairs)
    print(f"source: {total} chunks  ({args.src}::{args.collection})")
    if not total:
        print("nothing to copy")
        return

    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma
    emb = OpenAIEmbeddings(api_key=key, base_url=base, model=args.model,
                           check_embedding_ctx_length=False)
    dst = Chroma(persist_directory=args.dst, embedding_function=emb)

    done = 0
    for i in range(0, total, args.batch):
        batch = pairs[i:i + args.batch]
        dst.add_texts(texts=[p[0] for p in batch], metadatas=[p[1] for p in batch])
        done += len(batch)
        print(f"  {done}/{total}")
        if args.sleep:
            time.sleep(args.sleep)
    print(f"done -> {args.dst}   (model: {args.model})")


if __name__ == "__main__":
    main()
