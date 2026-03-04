-- ══════════════════════════════════════════════════════
-- Migration: Gemini embedding-001 (768-dim) → OpenAI text-embedding-3-small (1536-dim)
--
-- This migration:
--   1. Drops HNSW indexes on embedding columns
--   2. Drops old RPC functions
--   3. Clears all existing embeddings (incompatible between models)
--   4. Alters vector columns from 768 → 1536 dimensions
--   5. Recreates HNSW indexes
--   6. Recreates RPC functions with correct signatures
--
-- After running this, re-ingest the knowledge base:
--   npm run ingest
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Drop existing HNSW indexes
DROP INDEX IF EXISTS idx_kb_chunks_embedding;
DROP INDEX IF EXISTS idx_analyses_embedding;

-- 2. Drop old RPC functions (they reference vector(768))
DROP FUNCTION IF EXISTS match_kb_chunks;
DROP FUNCTION IF EXISTS match_analyses;

-- 3. Clear existing embeddings (Gemini vectors ≠ OpenAI vectors)
DELETE FROM kb_chunks;
-- Keep analyses rows (cache still valid by sentence_hash) but null out embeddings
UPDATE analyses SET embedding = NULL;

-- 4. Alter columns: 768 → 1536 dimensions
ALTER TABLE kb_chunks ALTER COLUMN embedding TYPE vector(1536);
ALTER TABLE analyses ALTER COLUMN embedding TYPE vector(1536);

-- 5. Recreate HNSW indexes
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_analyses_embedding ON analyses
  USING hnsw (embedding vector_cosine_ops);

-- 6. Recreate RPC functions with vector(1536)

CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  document_title TEXT,
  document_category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    d.category AS document_category
  FROM kb_chunks c
  JOIN kb_documents d ON c.document_id = d.id
  WHERE (filter_category IS NULL OR d.category = filter_category)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_analyses(
  query_embedding vector(1536),
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  sentence TEXT,
  result_json JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.sentence,
    a.result_json,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM analyses a
  WHERE a.status = 'approved'
    AND a.embedding IS NOT NULL
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
