-- ═══════════════════════════════════════════════════════════════════════════
-- RAG schema evolution + lesson publish snapshots + authoring bridges

--
-- PREREQUISITES
--   • Tables must already exist: analyses, lessons, lesson_segments
--     (from scripts/setup-db.sql for RAG, then scripts/create-admin-tables.sql
--      for lessons — analyses MUST exist before lesson_segment_analyses FK.)
--
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS / DROP TRIGGER IF EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── analyses: provenance + typed KB chunk ids + RAG trace ───────────────────
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS embedding_dim INT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS llm_model TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS prompt_version TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS kb_version TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS retrieved_kb_chunk_ids UUID[];
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS rag_trace_json JSONB;

COMMENT ON COLUMN analyses.retrieved_kb_chunk_ids IS 'KB chunk UUIDs used for RAG context (parallel to rag_chunks_used TEXT[])';
COMMENT ON COLUMN analyses.rag_trace_json IS 'Compact RAG debug: counts, char estimates, timing';

-- ── lessons: immutable publish snapshot + teacher grammar notes ─────────────
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS published_payload JSONB;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS published_version INT NOT NULL DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS grammar_notes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN lessons.published_payload IS 'Frozen segment bundle (+ notes) last time lesson was published';
COMMENT ON COLUMN lessons.published_version IS 'Increments on each successful publish';

-- ── Bridge: segment ↔ cached analysis (audit / reuse) ──────────────────────
CREATE TABLE IF NOT EXISTS lesson_segment_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_segment_id UUID NOT NULL REFERENCES lesson_segments(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_segment_id, analysis_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_segment_analyses_segment
  ON lesson_segment_analyses(lesson_segment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_segment_analyses_analysis
  ON lesson_segment_analyses(analysis_id);

ALTER TABLE lesson_segment_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage segment-analysis links for own lessons" ON lesson_segment_analyses;
CREATE POLICY "Teachers manage segment-analysis links for own lessons"
  ON lesson_segment_analyses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lesson_segments ls
      JOIN lessons l ON l.id = ls.lesson_id
      WHERE ls.id = lesson_segment_analyses.lesson_segment_id
        AND l.created_by = auth.uid()
    )
  );

-- ── Optional JSON-first units (scenes / exercises) ──────────────────────────
CREATE TABLE IF NOT EXISTS lesson_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('scene', 'instruction', 'exercise', 'reading')),
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_units_lesson_id ON lesson_units(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_units_sort ON lesson_units(lesson_id, sort_order);

DROP TRIGGER IF EXISTS lesson_units_updated_at ON lesson_units;
CREATE TRIGGER lesson_units_updated_at
  BEFORE UPDATE ON lesson_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE lesson_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers CRUD units for own lessons" ON lesson_units;
CREATE POLICY "Teachers CRUD units for own lessons"
  ON lesson_units FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_units.lesson_id
        AND l.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view units of published lessons" ON lesson_units;
CREATE POLICY "Anyone can view units of published lessons"
  ON lesson_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_units.lesson_id
        AND l.status = 'published'
    )
  );

SELECT 'migrate-rag-schema-evolution: done' AS status;
