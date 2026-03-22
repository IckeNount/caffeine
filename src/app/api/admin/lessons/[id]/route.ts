import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";
import type { PublishedLessonPayload } from "@/shared/lib/lessons/publish-payload";
import type { GrammarNote } from "@/shared/types/lesson-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/lessons/[id] — Get a single lesson with all segments
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select("*, folder:folders(id, name, color), segments:lesson_segments(*)")
      .eq("id", id)
      .eq("created_by", profile.id)
      .order("sort_order", {
        referencedTable: "lesson_segments",
        ascending: true,
      })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json({ lesson: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Get lesson error:", error);
    return NextResponse.json(
      { error: "Failed to get lesson" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/lessons/[id] — Update a lesson (including publish/unpublish)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.folder_id !== undefined)
      updateData.folder_id = body.folder_id || null;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.audio_path !== undefined) updateData.audio_path = body.audio_path;
    if (body.audio_mime !== undefined) updateData.audio_mime = body.audio_mime;
    if (body.grammar_notes !== undefined)
      updateData.grammar_notes = body.grammar_notes;

    // Handle status changes (publish / unpublish / archive)
    if (body.status !== undefined) {
      const validStatuses = ["draft", "published", "archived"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = body.status;

      if (body.status === "published") {
        const now = new Date().toISOString();
        updateData.published_at = now;

        const { data: meta, error: metaErr } = await supabaseAdmin
          .from("lessons")
          .select("published_version, grammar_notes")
          .eq("id", id)
          .eq("created_by", profile.id)
          .single();

        if (metaErr || !meta) {
          return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
        }

        const { data: segs, error: segErr } = await supabaseAdmin
          .from("lesson_segments")
          .select(
            "id, sort_order, original_text, thai_translation, grammar_breakdown, audio_start, audio_end",
          )
          .eq("lesson_id", id)
          .order("sort_order", { ascending: true });

        if (segErr) throw segErr;

        const nextVersion = (meta.published_version ?? 0) + 1;
        const notesForSnapshot: GrammarNote[] | null =
          body.grammar_notes !== undefined
            ? body.grammar_notes
            : (meta.grammar_notes as GrammarNote[] | null) ?? null;

        const payload: PublishedLessonPayload = {
          version: nextVersion,
          snapshot_at: now,
          grammar_notes: notesForSnapshot,
          segments: segs ?? [],
        };

        updateData.published_version = nextVersion;
        updateData.published_payload = payload;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .update(updateData)
      .eq("id", id)
      .eq("created_by", profile.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json({ lesson: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Update lesson error:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/lessons/[id] — Delete a lesson and all its segments
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("id", id)
      .eq("created_by", profile.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Delete lesson error:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 },
    );
  }
}
