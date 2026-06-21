-- Run this in the Supabase SQL editor.
-- Adds per-teacher API key columns to the profiles table.
-- Existing RLS policies cover these columns automatically.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gemini_api_key   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT DEFAULT NULL;
