import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

// GET /api/admin/folders — List folders for the authenticated teacher
export async function GET() {
  try {
    const { profile } = await requireTeacher();

    const { data, error } = await supabaseAdmin
      .from("folders")
      .select("*, lessons:lessons(count)")
      .eq("created_by", profile.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ folders: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("List folders error:", error);
    return NextResponse.json(
      { error: "Failed to list folders" },
      { status: 500 },
    );
  }
}

// POST /api/admin/folders — Create a new folder
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireTeacher();
    const { name, description, color } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("folders")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#3B82F6",
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ folder: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Create folder error:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 },
    );
  }
}
