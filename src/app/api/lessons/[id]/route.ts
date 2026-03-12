import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/lessons/[id] — Get a single published lesson with segments (student-facing)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, title, status, tags, difficulty, audio_path, audio_mime, published_at, folder:folders(id, name, color), segments:lesson_segments(id, sort_order, original_text, thai_translation, grammar_breakdown, audio_start, audio_end)",
      )
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

    const response = NextResponse.json({ lesson: data });

    // Cache individual lessons for 60s
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
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
