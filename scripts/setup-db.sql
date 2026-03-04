-- ══════════════════════════════════════════════════════
-- LinguBreak RAG Database — CLEAN RESET
-- Drops everything and recreates with correct dimensions.
-- Run this in Supabase SQL Editor.
-- ══════════════════════════════════════════════════════

-- Drop existing objects
DROP FUNCTION IF EXISTS match_kb_chunks CASCADE;
DROP FUNCTION IF EXISTS match_analyses CASCADE;
DROP INDEX IF EXISTS idx_kb_chunks_embedding;
DROP INDEX IF EXISTS idx_analyses_embedding;
DROP INDEX IF EXISTS idx_kb_chunks_document;
DROP INDEX IF EXISTS idx_kb_documents_category;
DROP INDEX IF EXISTS idx_analyses_hash;
DROP INDEX IF EXISTS idx_analyses_status;
DROP TABLE IF EXISTS kb_chunks CASCADE;
DROP TABLE IF EXISTS kb_documents CASCADE;
DROP TABLE IF EXISTS analyses CASCADE;

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base documents
CREATE TABLE kb_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL CHECK (category IN ('grammar', 'errors', 'pedagogy', 'examples')),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  checksum      TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks with 1536-dim embeddings (OpenAI text-embedding-3-small)
CREATE TABLE kb_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID REFERENCES kb_documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  embedding     vector(1536) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Cached sentence analyses
CREATE TABLE analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence        TEXT NOT NULL,
  sentence_hash   TEXT NOT NULL,
  embedding       vector(1536),
  provider        TEXT NOT NULL,
  result_json     JSONB NOT NULL,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved')),
  rag_chunks_used TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sentence_hash)
);

-- Indexes
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_analyses_embedding ON analyses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_kb_chunks_document ON kb_chunks(document_id);
CREATE INDEX idx_kb_documents_category ON kb_documents(category);
CREATE INDEX idx_analyses_hash ON analyses(sentence_hash);
CREATE INDEX idx_analyses_status ON analyses(status);

-- RPC: search KB chunks by similarity
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
    c.id, c.content, c.metadata,
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

-- RPC: find similar past analyses
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
    a.id, a.sentence, a.result_json,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM analyses a
  WHERE a.status = 'approved' AND a.embedding IS NOT NULL
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
