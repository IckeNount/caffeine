import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/lessons/[id]/segments — List segments for a lesson
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;

    // Verify the lesson belongs to this teacher
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("id", id)
      .eq("created_by", profile.id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("lesson_segments")
      .select("*")
      .eq("lesson_id", id)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ segments: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("List segments error:", error);
    return NextResponse.json(
      { error: "Failed to list segments" },
      { status: 500 },
    );
  }
}

// POST /api/admin/lessons/[id]/segments — Add segment(s) to a lesson
// Supports both single segment and bulk upload (array of segments)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;
    const body = await request.json();

    // Verify lesson ownership
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("id", id)
      .eq("created_by", profile.id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Get current max sort_order
    const { data: maxRow } = await supabaseAdmin
      .from("lesson_segments")
      .select("sort_order")
      .eq("lesson_id", id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxRow?.sort_order ?? -1) + 1;

    // Support both single and bulk segment creation
    const segments = Array.isArray(body.segments) ? body.segments : [body];

    const insertData = segments.map(
      (seg: {
        original_text: string;
        thai_translation?: string;
        grammar_breakdown?: object;
        audio_start?: number;
        audio_end?: number;
      }) => ({
        lesson_id: id,
        original_text: seg.original_text?.trim(),
        thai_translation: seg.thai_translation?.trim() || null,
        grammar_breakdown: seg.grammar_breakdown || null,
        audio_start: seg.audio_start ?? null,
        audio_end: seg.audio_end ?? null,
        sort_order: nextOrder++,
      }),
    );

    // Validate all segments have original_text
    if (insertData.some((s: { original_text: string }) => !s.original_text)) {
      return NextResponse.json(
        { error: "Each segment must have original_text" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("lesson_segments")
      .insert(insertData)
      .select();

    if (error) throw error;

    return NextResponse.json({ segments: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Create segments error:", error);
    return NextResponse.json(
      { error: "Failed to create segments" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/lessons/[id]/segments — Bulk update segments (reorder, update translations)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;
    const { segments } = await request.json();

    // Verify lesson ownership
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("id", id)
      .eq("created_by", profile.id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (!Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json(
        { error: "Segments array is required" },
        { status: 400 },
      );
    }

    // Update each segment individually (Supabase doesn't support bulk upsert with different values easily)
    const results = [];
    for (const seg of segments) {
      if (!seg.id) continue;

      const updateData: Record<string, unknown> = {};
      if (seg.original_text !== undefined)
        updateData.original_text = seg.original_text.trim();
      if (seg.thai_translation !== undefined)
        updateData.thai_translation = seg.thai_translation?.trim() || null;
      if (seg.grammar_breakdown !== undefined)
        updateData.grammar_breakdown = seg.grammar_breakdown;
      if (seg.sort_order !== undefined) updateData.sort_order = seg.sort_order;
      if (seg.audio_start !== undefined)
        updateData.audio_start = seg.audio_start;
      if (seg.audio_end !== undefined) updateData.audio_end = seg.audio_end;

      const { data, error } = await supabaseAdmin
        .from("lesson_segments")
        .update(updateData)
        .eq("id", seg.id)
        .eq("lesson_id", id)
        .select()
        .single();

      if (!error && data) results.push(data);
    }

    return NextResponse.json({ segments: results });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Update segments error:", error);
    return NextResponse.json(
      { error: "Failed to update segments" },
      { status: 500 },
    );
  }
}
