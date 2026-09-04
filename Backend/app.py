import os
import json
import shutil
from typing import Annotated, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator

from database import (
    engine, Base, get_db, SessionLocal, User, ChatSession, ChatMessage,
    KnowledgeSource, ensure_columns,
)
from datetime import datetime
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    timedelta
)
from rag_pipeline import (
    rag_answer, rag_answer_stream, ingest_document, delete_source,
    ingest_file_stream, ingest_url_stream, ingest_api_stream,
    ingest_github_stream, import_feed_stream,
)

# Create Tables
Base.metadata.create_all(bind=engine)
ensure_columns()  # add reasoning / sources columns to pre-existing chat_messages

app = FastAPI(
    title="RAG Backend Service",
    description="Context-grounded RAG API with Auth & Roles",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Schemas
# -------------------------

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "student"  # default to student

class Token(BaseModel):
    access_token: str
    token_type: str

class QueryRequest(BaseModel):
    question: str

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    reasoning: Optional[str] = None
    sources: Optional[list] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("sources", mode="before")
    @classmethod
    def _parse_sources(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (ValueError, TypeError):
                return None
        return v

class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}

class SourceResponse(BaseModel):
    id: int
    source_type: str
    title: str
    origin: str
    ref: str
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

class UrlIngestRequest(BaseModel):
    url: str

class ApiIngestRequest(BaseModel):
    url: str
    headers: Optional[dict] = None
    json_path: str = ""
    title_key: Optional[str] = None

class GithubIngestRequest(BaseModel):
    repo_url: str
    branch: str = "main"

class FeedIngestRequest(BaseModel):
    feed: str  # mitre_attack | cisa_kev | cisa_advisories
    include_subtechniques: bool = False
    limit: int = 25

# -------------------------
# Auth Endpoints
# -------------------------

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        hashed_password=hashed_password,
        role="student"  # Force student role regardless of input
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/register_admin", status_code=status.HTTP_201_CREATED)
def register_admin(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        hashed_password=hashed_password,
        role="admin"  # Force admin role
    )
    db.add(new_user)
    db.commit()
    return {"message": "Admin user created successfully"}

@app.post("/token", response_model=Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "role": current_user.role
    }

# -------------------------
# File Upload (Admin Only)
# -------------------------

UPLOAD_DIR = os.path.join(os.getenv("DATA_DIR", "."), "uploaded_files")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user)
):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Ingest into RAG
    try:
        ingest_document(file_location)
    except Exception as e:
        status_code = getattr(e, "status_code", None)
        if not status_code or not isinstance(status_code, int) or status_code < 400 or status_code > 599:
            status_code = 400

        detail_msg = str(e)
        if hasattr(e, "response") and hasattr(e.response, "json"):
            try:
                err_json = e.response.json()
                if "error" in err_json and "message" in err_json["error"]:
                    detail_msg = err_json["error"]["message"]
            except Exception:
                pass
        elif hasattr(e, "message") and e.message:
            detail_msg = str(e.message)

        raise HTTPException(status_code=status_code, detail=f"Ingestion failed: {detail_msg}")
        
    return {"filename": file.filename, "status": "Uploaded and Indexed"}

@app.get("/files")
def list_files(current_user: User = Depends(get_current_admin_user)):
    try:
        files = []
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                filepath = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(filepath):
                    files.append({
                        "filename": filename,
                        "size": os.path.getsize(filepath),
                        "uploaded_at": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
                    })
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

# -------------------------
# Multi-channel ingestion (Admin, SSE progress)
# -------------------------

def _ingest_sse(gen):
    """Wrap an ingest generator (from rag_pipeline) into an SSE stream:
    forwards every event, records a KnowledgeSource row on `done`, turns any
    exception into an `error` event. Mirrors ask_rag_session_stream's event_gen.
    ponytail: sync generator holds one worker for the whole ingest."""
    def event_gen():
        meta, chunk_count = {}, 0
        try:
            for evt in gen:
                if evt.get("type") == "meta":
                    meta = evt
                elif evt.get("type") == "done":
                    chunk_count = evt.get("chunk_count", 0)
                yield f"data: {json.dumps(evt)}\n\n"
        except Exception as e:  # noqa: BLE001 - report to the client
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return
        if meta:
            wdb = SessionLocal()
            try:
                row = KnowledgeSource(
                    source_type=meta.get("source_type", "text"),
                    title=meta.get("title", "source"),
                    origin=meta.get("origin", "file"),
                    ref=meta.get("ref", meta.get("title", "source")),
                    chunk_count=chunk_count,
                )
                wdb.add(row)
                wdb.commit()
                wdb.refresh(row)
                yield f"data: {json.dumps({'type': 'source', 'id': row.id, 'source_type': row.source_type, 'title': row.title, 'origin': row.origin, 'ref': row.ref, 'chunk_count': row.chunk_count})}\n\n"
            finally:
                wdb.close()
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@app.post("/ingest/file")
def ingest_files(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_admin_user),
):
    saved = []
    for f in files:
        dest = os.path.join(UPLOAD_DIR, f.filename)
        with open(dest, "wb") as buf:
            shutil.copyfileobj(f.file, buf)
        saved.append(dest)

    # Multi-file: record one KnowledgeSource row per file as it finishes.
    def event_gen():
        try:
            meta = {}
            for idx, path in enumerate(saved):
                name = os.path.basename(path)
                if len(saved) > 1:
                    yield f"data: {json.dumps({'type': 'step', 'label': f'File {idx + 1} of {len(saved)}'})}\n\n"
                count = 0
                for evt in ingest_file_stream(path):
                    if evt.get("type") == "meta":
                        meta = evt
                    elif evt.get("type") == "done":
                        count = evt.get("chunk_count", 0)
                    else:
                        yield f"data: {json.dumps(evt)}\n\n"
                wdb = SessionLocal()
                try:
                    row = KnowledgeSource(
                        source_type=meta.get("source_type", "text"), title=name,
                        origin="file", ref=name, chunk_count=count,
                    )
                    wdb.add(row); wdb.commit(); wdb.refresh(row)
                    yield f"data: {json.dumps({'type': 'source', 'id': row.id, 'source_type': row.source_type, 'title': row.title, 'origin': row.origin, 'ref': row.ref, 'chunk_count': row.chunk_count})}\n\n"
                finally:
                    wdb.close()
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        except Exception as e:  # noqa: BLE001
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/ingest/url")
def ingest_url(body: UrlIngestRequest, current_user: User = Depends(get_current_admin_user)):
    return _ingest_sse(ingest_url_stream(body.url))


@app.post("/ingest/api")
def ingest_api(body: ApiIngestRequest, current_user: User = Depends(get_current_admin_user)):
    return _ingest_sse(ingest_api_stream(body.url, body.headers, body.json_path, body.title_key))


@app.post("/ingest/github")
def ingest_github(body: GithubIngestRequest, current_user: User = Depends(get_current_admin_user)):
    return _ingest_sse(ingest_github_stream(body.repo_url, body.branch))


@app.post("/ingest/feed")
def ingest_feed(body: FeedIngestRequest, current_user: User = Depends(get_current_admin_user)):
    return _ingest_sse(import_feed_stream(body.feed, body.include_subtechniques, body.limit))


@app.get("/sources", response_model=list[SourceResponse])
def list_sources(current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    return db.query(KnowledgeSource).order_by(KnowledgeSource.created_at.desc()).all()


@app.get("/sources/graph")
def sources_graph(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Node list for the knowledge-graph view — one node per uploaded source.
    Readable by any authenticated user; deliberately no `ref` / no chunk detail."""
    rows = db.query(KnowledgeSource).order_by(KnowledgeSource.created_at.asc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "source_type": r.source_type,
            "origin": r.origin,
            "chunk_count": r.chunk_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@app.delete("/sources/{source_id}")
def remove_source(
    source_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    row = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Source not found")
    removed = delete_source(row.ref)
    if row.origin == "file":
        try:
            os.remove(os.path.join(UPLOAD_DIR, row.ref))
        except OSError:
            pass
    db.delete(row)
    db.commit()
    return {"deleted": True, "chunks_removed": removed}

# -------------------------
# RAG Endpoint
# -------------------------

@app.post("/ask")
def ask_rag_deprecated(
    query: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    answer = rag_answer(query.question)
    return {
        "question": query.question,
        "answer": answer,
    }

# -------------------------
# Chat Session Endpoints
# -------------------------

@app.get("/sessions", response_model=list[ChatSessionResponse])
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.created_at.desc()).all()
    return sessions

@app.post("/sessions", response_model=ChatSessionResponse)
def create_session(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_session = ChatSession(user_id=current_user.id, title="New Chat")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@app.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
def get_session_messages(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.messages

@app.post("/sessions/{session_id}/ask")
def ask_rag_session(
    session_id: int,
    query: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update title if it's "New Chat" and this is the first message
    if session.title == "New Chat":
        session.title = query.question[:30] + ("..." if len(query.question) > 30 else "")
        db.commit()

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=query.question)
    db.add(user_msg)
    db.commit()

    # Call RAG
    try:
        answer = rag_answer(query.question)
    except Exception as e:
        answer = f"Error generating response: {str(e)}"
    
    # Save assistant message
    asst_msg = ChatMessage(session_id=session.id, role="assistant", content=answer)
    db.add(asst_msg)
    db.commit()

    return {
        "question": query.question,
        "answer": answer,
    }

@app.post("/sessions/{session_id}/ask/stream")
def ask_rag_session_stream(
    session_id: int,
    query: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.title == "New Chat":
        session.title = query.question[:30] + ("..." if len(query.question) > 30 else "")
        db.commit()

    db.add(ChatMessage(session_id=session.id, role="user", content=query.question))
    db.commit()

    sid = session.id
    question = query.question

    def event_gen():
        answer_parts, reasoning_parts, sources = [], [], None
        try:
            for evt in rag_answer_stream(question):
                etype = evt.get("type")
                if etype == "delta":
                    answer_parts.append(evt["text"])
                elif etype == "reasoning":
                    reasoning_parts.append(evt["delta"])
                elif etype == "sources":
                    sources = evt["sources"]
                yield f"data: {json.dumps(evt)}\n\n"
        except Exception as e:  # noqa: BLE001 - report the failure to the client
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            # Persist on a fresh session: the request-scoped db is torn down
            # once the endpoint returns, before this generator finishes draining.
            content = "".join(answer_parts)
            reasoning = "".join(reasoning_parts)
            if content or reasoning:  # skip empty turns from an aborted stream
                wdb = SessionLocal()
                try:
                    wdb.add(ChatMessage(
                        session_id=sid,
                        role="assistant",
                        content=content,
                        reasoning=reasoning or None,
                        sources=json.dumps(sources) if sources else None,
                    ))
                    wdb.commit()
                finally:
                    wdb.close()
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@app.get("/")
def health_check():
    return {"status": "RAG service v2 is running"}
