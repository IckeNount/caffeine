import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

interface RouteParams {
  params: Promise<{ id: string; segmentId: string }>;
}

/**
 * POST — Link a cached `analyses` row to a lesson segment (authoring audit trail).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id: lessonId, segmentId } = await params;
    const { analysis_id } = await request.json();

    if (!analysis_id || typeof analysis_id !== "string") {
      return NextResponse.json(
        { error: "analysis_id is required" },
        { status: 400 },
      );
    }

    const { data: seg, error: segErr } = await supabaseAdmin
      .from("lesson_segments")
      .select("id, lesson_id")
      .eq("id", segmentId)
      .eq("lesson_id", lessonId)
      .single();

    if (segErr || !seg) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("created_by", profile.id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const { data: analysis } = await supabaseAdmin
      .from("analyses")
      .select("id")
      .eq("id", analysis_id)
      .single();

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("lesson_segment_analyses")
      .insert({
        lesson_segment_id: segmentId,
        analysis_id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Link already exists", link: { lesson_segment_id: segmentId, analysis_id } },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ link: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Link segment analysis error:", error);
    return NextResponse.json(
      { error: "Failed to link analysis" },
      { status: 500 },
    );
  }
}
