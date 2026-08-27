import psycopg
from app.config import settings
from app.database import get_db_connection

INIT_SQL = """
-- 1. Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Moods Table
CREATE TABLE IF NOT EXISTS moods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood VARCHAR(50) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moods_user_created_at ON moods (user_id, created_at DESC);

-- 4. Journals Table
CREATE TABLE IF NOT EXISTS journals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journals_user_created_at ON journals (user_id, created_at DESC);

-- 5. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  chat_type VARCHAR(20) DEFAULT 'wellness_guide' NOT NULL,
  recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created_at ON chat_messages (user_id, created_at ASC);

-- 6. Safety Events Table
CREATE TABLE IF NOT EXISTS safety_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  source VARCHAR(40) NOT NULL,
  message_preview TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Knowledge Base (pgvector) Table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(80) NOT NULL DEFAULT 'General Wellness',
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_curated BOOLEAN NOT NULL DEFAULT false,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_created_at ON knowledge_base (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_curated_category ON knowledge_base (is_curated, category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
"""

def apply_migrations():
    print(f"Connecting to database {settings.DB_NAME} on {settings.DB_HOST}...")
    try:
        with get_db_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                print("Running database migrations...")
                cur.execute(INIT_SQL)
                print("Successfully initialized all database tables and pgvector indexes!")
    except Exception as e:
        print(f"Database migration failed: {e}")

if __name__ == "__main__":
    apply_migrations()
