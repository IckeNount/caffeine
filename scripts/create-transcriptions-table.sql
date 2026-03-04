-- ==========================================
-- Transcription Engine: Database Schema
-- ==========================================
-- Run this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → paste → Run

-- 1. Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT,                            -- user-editable label (auto-set from first words)
  original_text TEXT NOT NULL,                   -- raw Whisper output
  edited_text   TEXT,                            -- user-corrected version (NULL = not edited)
  segments      JSONB NOT NULL DEFAULT '[]'::jsonb, -- timestamp segments [{id, start, end, text}]
  duration      REAL NOT NULL DEFAULT 0,         -- audio duration in seconds
  language      TEXT NOT NULL DEFAULT 'en',
  model         TEXT NOT NULL,                   -- whisper model used
  audio_path    TEXT,                            -- Supabase Storage path (e.g., "abc123.mp3")
  audio_mime    TEXT,                            -- original MIME type
  processing_ms INTEGER,                        -- transcription processing time
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index for listing recent transcriptions
CREATE INDEX IF NOT EXISTS idx_transcriptions_created
  ON transcriptions(created_at DESC);

-- 3. Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_transcription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transcription_updated ON transcriptions;
CREATE TRIGGER trg_transcription_updated
  BEFORE UPDATE ON transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_transcription_timestamp();

-- 4. Create storage bucket for audio files (run once)
-- NOTE: You may need to create this via Supabase Dashboard → Storage → New Bucket
-- Bucket name: transcription-audio
-- Public: true (so <audio> can fetch the file)

-- Done!
SELECT 'Transcription schema created successfully!' AS status;
