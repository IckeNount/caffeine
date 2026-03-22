import type { GrammarNote } from "@/shared/types/lesson-types";

/** Stored on `lessons.published_payload` when a teacher publishes. */
export interface PublishedLessonPayload {
  version: number;
  snapshot_at: string;
  grammar_notes: GrammarNote[] | null;
  segments: PublishedSegmentSnapshot[];
}

export interface PublishedSegmentSnapshot {
  id: string;
  sort_order: number;
  original_text: string;
  thai_translation: string | null;
  grammar_breakdown: unknown | null;
  audio_start: number | null;
  audio_end: number | null;
}

export function isPublishedLessonPayload(
  value: unknown
): value is PublishedLessonPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.segments) &&
    typeof v.version === "number" &&
    typeof v.snapshot_at === "string"
  );
}
