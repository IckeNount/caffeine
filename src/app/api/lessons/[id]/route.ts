import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/db/supabase";
import {
  isPublishedLessonPayload,
} from "@/shared/lib/lessons/publish-payload";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const LESSON_SELECT = `
  id,
  title,
  status,
  tags,
  difficulty,
  audio_path,
  audio_mime,
  published_at,
  grammar_notes,
  published_payload,
  published_version,
  folder:folders(id, name, color),
  segments:lesson_segments(
    id,
    sort_order,
    original_text,
    thai_translation,
    grammar_breakdown,
    audio_start,
    audio_end
  )
`;

// GET /api/lessons/[id] — Get a single published lesson with segments (student-facing)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select(LESSON_SELECT)
      .eq("id", id)
      .eq("status", "published")
      .order("sort_order", {
        referencedTable: "lesson_segments",
        ascending: true,
      })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const raw = data as Record<string, unknown>;
    const publishedPayload = raw.published_payload;
    const useSnapshot =
      isPublishedLessonPayload(publishedPayload) &&
      publishedPayload.segments.length > 0;

    const segments = useSnapshot
      ? publishedPayload.segments
      : (raw.segments as unknown[]);

    const grammar_notes = useSnapshot
      ? publishedPayload.grammar_notes ?? (raw.grammar_notes as unknown) ?? null
      : (raw.grammar_notes as unknown) ?? null;

    const {
      published_payload: _pp,
      published_version: _pv,
      segments: _legacySegs,
      grammar_notes: _gn,
      ...rest
    } = raw;

    const lesson = {
      ...rest,
      segments,
      grammar_notes,
    };

    const response = NextResponse.json({ lesson });

    // Published lessons are immutable between publishes — cache longer at the edge
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=600",
    );

    return response;
  } catch (error) {
    console.error("Get published lesson error:", error);
    return NextResponse.json(
      { error: "Failed to load lesson" },
      { status: 500 },
    );
  }
}
