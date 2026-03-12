import type {
  LessonsListResponse,
  LessonDetailResponse,
  LessonsQueryParams,
} from "@/shared/types/lesson-types";

const ADMIN_API = "/api/admin/lessons";

// ── List ──────────────────────────────────────────────────────────

export interface AdminLessonsQueryParams extends LessonsQueryParams {
  status?: string;
  search?: string;
}

export async function fetchAdminLessons(
  params?: AdminLessonsQueryParams,
): Promise<LessonsListResponse> {
  const url = new URL(ADMIN_API, window.location.origin);
  if (params?.folder_id) url.searchParams.set("folder_id", params.folder_id);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch lessons: ${res.status}`);
  return res.json();
}

// ── Detail ────────────────────────────────────────────────────────

export async function fetchAdminLesson(
  id: string,
): Promise<LessonDetailResponse> {
  const res = await fetch(`${ADMIN_API}/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Lesson not found");
    throw new Error(`Failed to fetch lesson: ${res.status}`);
  }
  return res.json();
}

// ── Create ────────────────────────────────────────────────────────

export interface CreateLessonPayload {
  title: string;
  folder_id?: string | null;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced" | null;
}

export async function createLesson(
  data: CreateLessonPayload,
): Promise<{ lesson: { id: string } }> {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create lesson: ${res.status}`);
  }
  return res.json();
}

// ── Update ────────────────────────────────────────────────────────

export async function updateLesson(
  id: string,
  data: Record<string, unknown>,
): Promise<{ lesson: Record<string, unknown> }> {
  const res = await fetch(`${ADMIN_API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update lesson: ${res.status}`);
  }
  return res.json();
}

// ── Delete ────────────────────────────────────────────────────────

export async function deleteLesson(
  id: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${ADMIN_API}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete lesson: ${res.status}`);
  }
  return res.json();
}

// ── Segments ──────────────────────────────────────────────────────

export interface SegmentPayload {
  original_text: string;
  thai_translation?: string | null;
  grammar_breakdown?: Record<string, unknown> | null;
  audio_start?: number | null;
  audio_end?: number | null;
}

export async function createSegments(
  lessonId: string,
  segments: SegmentPayload[],
): Promise<{ segments: unknown[] }> {
  const res = await fetch(`${ADMIN_API}/${lessonId}/segments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create segments: ${res.status}`);
  }
  return res.json();
}

export async function updateSegments(
  lessonId: string,
  segments: (SegmentPayload & { id: string; sort_order?: number })[],
): Promise<{ segments: unknown[] }> {
  const res = await fetch(`${ADMIN_API}/${lessonId}/segments`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update segments: ${res.status}`);
  }
  return res.json();
}
