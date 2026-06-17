import type {
  LessonsListResponse,
  LessonDetailResponse,
  LessonsQueryParams,
} from "@/shared/types/lesson-types";

const API_BASE = "/api/lessons";

/**
 * Fetch published lessons list.
 * Calls GET /api/lessons with optional filtering.
 */
export async function fetchLessons(
  params?: LessonsQueryParams,
): Promise<LessonsListResponse> {
  const url = new URL(API_BASE, window.location.origin);

  if (params?.folder_id) url.searchParams.set("folder_id", params.folder_id);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString());

  if (!res.ok) {
    const raw = await res.text();
    let detail = "";
    try {
      const body = JSON.parse(raw) as { error?: string };
      if (body?.error) detail = `: ${body.error}`;
    } catch {
      if (raw) detail = `: ${raw.slice(0, 200)}`;
    }
    throw new Error(`Failed to fetch lessons (${res.status})${detail}`);
  }

  const data = (await res.json()) as LessonsListResponse;
  return {
    lessons: Array.isArray(data.lessons) ? data.lessons : [],
    total: typeof data.total === "number" ? data.total : null,
  };
}

/**
 * Fetch a single published lesson with all segments.
 * Calls GET /api/lessons/[id].
 */
export async function fetchLesson(id: string): Promise<LessonDetailResponse> {
  const res = await fetch(`${API_BASE}/${id}`);

  if (!res.ok) {
    if (res.status === 404) throw new Error("Lesson not found");
    throw new Error(`Failed to fetch lesson: ${res.status}`);
  }

  return res.json();
}
