import os
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime

# DATA_DIR points at a persistent volume in production (e.g. Railway) so the
# SQLite file survives redeploys; defaults to the working directory locally.
DATA_DIR = os.getenv("DATA_DIR", ".")
os.makedirs(DATA_DIR, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATA_DIR}/users.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # "admin" or "student"
    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String)  # "user" or "assistant"
    content = Column(String)
    reasoning = Column(String, nullable=True)   # model + pipeline reasoning trace
    sources = Column(String, nullable=True)     # JSON: list[{id,title,snippet,kind,...}]
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class KnowledgeSource(Base):
    """One ingested unit in the knowledge base (a file, a URL, a repo, a feed import)."""
    __tablename__ = "knowledge_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String)   # pdf|docx|csv|xlsx|json|log|text|url|github|attack|kev|advisory
    title = Column(String)
    origin = Column(String)        # file|url|api|github|feed
    ref = Column(String, index=True)  # locator + the key used to delete chunks from Chroma
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


def ensure_columns():
    """Idempotent add of columns introduced after the table already existed.
    ponytail: raw ALTER over Alembic — one dev SQLite file, two nullable columns."""
    from sqlalchemy import inspect, text
    existing = {c["name"] for c in inspect(engine).get_columns("chat_messages")}
    with engine.begin() as conn:
        for col in ("reasoning", "sources"):
            if col not in existing:
                conn.execute(text(f"ALTER TABLE chat_messages ADD COLUMN {col} TEXT"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
