import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

// GET /api/admin/lessons — List lessons for the authenticated teacher
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireTeacher();
    const { searchParams } = new URL(request.url);

    const folderId = searchParams.get("folder_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabaseAdmin
      .from("lessons")
      .select(
        "*, folder:folders(id, name, color), segments:lesson_segments(count)",
        {
          count: "exact",
        },
      )
      .eq("created_by", profile.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) query = query.eq("folder_id", folderId);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ lessons: data, total: count });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("List lessons error:", error);
    return NextResponse.json(
      { error: "Failed to list lessons" },
      { status: 500 },
    );
  }
}

// POST /api/admin/lessons — Create a new lesson
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireTeacher();
    const { title, folder_id, tags, difficulty } = await request.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Lesson title is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .insert({
        title: title.trim(),
        folder_id: folder_id || null,
        tags: tags || [],
        difficulty: difficulty || null,
        created_by: profile.id,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lesson: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Create lesson error:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 },
    );
  }
}
