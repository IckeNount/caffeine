-- =============================================================================
-- Admin Dashboard Tables Migration
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'teacher'  -- Default to teacher for self-registration (change as needed)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  sort_order INT DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  audio_path TEXT,
  audio_mime TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Lesson segments table
CREATE TABLE IF NOT EXISTS lesson_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  original_text TEXT NOT NULL,
  thai_translation TEXT,
  grammar_breakdown JSONB,
  audio_start REAL,
  audio_end REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER lesson_segments_updated_at
  BEFORE UPDATE ON lesson_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Translation jobs queue
CREATE TABLE IF NOT EXISTS translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'deepseek')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_segments INT NOT NULL DEFAULT 0,
  completed_segments INT NOT NULL DEFAULT 0,
  results JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile, teachers/admins can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Folders: teachers see their own folders
CREATE POLICY "Teachers can CRUD own folders"
  ON folders FOR ALL USING (auth.uid() = created_by);

-- Lessons: teachers see their own, students see published only
CREATE POLICY "Teachers can CRUD own lessons"
  ON lessons FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view published lessons"
  ON lessons FOR SELECT USING (status = 'published');

-- Lesson segments: follow parent lesson access
CREATE POLICY "Teachers can CRUD segments of own lessons"
  ON lesson_segments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_segments.lesson_id
      AND lessons.created_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can view segments of published lessons"
  ON lesson_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_segments.lesson_id
      AND lessons.status = 'published'
    )
  );

-- Translation jobs: teachers see their own
CREATE POLICY "Teachers can manage own translation jobs"
  ON translation_jobs FOR ALL USING (auth.uid() = created_by);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_folders_created_by ON folders(created_by);
CREATE INDEX IF NOT EXISTS idx_lessons_folder_id ON lessons(folder_id);
CREATE INDEX IF NOT EXISTS idx_lessons_created_by ON lessons(created_by);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lesson_segments_lesson_id ON lesson_segments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_segments_sort_order ON lesson_segments(lesson_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_lesson_id ON translation_jobs(lesson_id);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);
