// ── Lesson Domain Types ──────────────────────────────────────────

/** Folder / category that groups lessons */
export interface Folder {
  id: string;
  name: string;
  color: string | null;
}

/** A single segment within a lesson */
export interface LessonSegment {
  id: string;
  sort_order: number;
  original_text: string;
  thai_translation: string | null;
  grammar_breakdown: GrammarBreakdown | null;
  audio_start: number | null;
  audio_end: number | null;
}

/** Grammar breakdown JSONB shape — flexible for now, tighten later */
export interface GrammarBreakdown {
  chunks?: GrammarChunk[];
  notes?: string;
  [key: string]: unknown;
}

export interface GrammarChunk {
  text: string;
  label: string;
  color?: string;
  thai?: string;
}

/** Lesson summary (list view — no segments) */
export interface Lesson {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  tags: string[] | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  folder_id: string | null;
  published_at: string | null;
  folder: Folder | null;
  segments: { count: number }[];
}

/** Full lesson with segments (detail view) */
export interface LessonDetail {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  tags: string[] | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  audio_path: string | null;
  audio_mime: string | null;
  published_at: string | null;
  folder: Folder | null;
  segments: LessonSegment[];
}

// ── API Response Wrappers ────────────────────────────────────────

export interface LessonsListResponse {
  lessons: Lesson[];
  total: number | null;
}

export interface LessonDetailResponse {
  lesson: LessonDetail;
}

// ── Query Params ─────────────────────────────────────────────────

export interface LessonsQueryParams {
  folder_id?: string;
  limit?: number;
  offset?: number;
}
