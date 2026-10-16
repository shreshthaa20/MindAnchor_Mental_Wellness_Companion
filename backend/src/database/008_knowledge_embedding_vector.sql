CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE knowledge_base
ALTER COLUMN embedding TYPE vector(768)
USING embedding::vector(768);

DROP INDEX IF EXISTS idx_knowledge_base_embedding;

CREATE INDEX idx_knowledge_base_embedding
ON knowledge_base USING hnsw (embedding vector_cosine_ops);
