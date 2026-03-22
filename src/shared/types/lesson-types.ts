import type {
  AnalysisChunk,
  AnalysisResult,
} from "@/features/lingubreak/lib/schema";

// ── Lesson Domain Types ──────────────────────────────────────────

/** Folder / category that groups lessons */
export interface Folder {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Stored in `lesson_segments.grammar_breakdown` — same shape as LinguBreak
 * `AnalysisResult`, plus optional teacher `notes`.
 */
export type GrammarBreakdown = AnalysisResult & {
  notes?: string;
};

/** @deprecated Use AnalysisChunk; kept as alias for imports */
export type GrammarChunk = AnalysisChunk;

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

/** A teacher-authored grammar note attached to a lesson */
export interface GrammarNote {
  title: string;
  content: string;
}

/** Full lesson with segments (detail view) */
/** JSON-first lesson unit (scene / exercise) — optional; see `lesson_units` table */
export interface LessonUnit {
  id: string;
  lesson_id: string;
  sort_order: number;
  unit_type: "scene" | "instruction" | "exercise" | "reading";
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LessonDetail {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  tags: string[] | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  audio_path: string | null;
  audio_mime: string | null;
  grammar_notes: GrammarNote[] | null;
  published_at: string | null;
  folder: Folder | null;
  segments: LessonSegment[];
  /** Present when loaded from admin API */
  units?: LessonUnit[];
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
