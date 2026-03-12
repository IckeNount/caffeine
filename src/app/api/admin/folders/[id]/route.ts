import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/folders/[id] — Get a single folder
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("folders")
      .select("*, lessons:lessons(id, title, status, created_at)")
      .eq("id", id)
      .eq("created_by", profile.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Get folder error:", error);
    return NextResponse.json(
      { error: "Failed to get folder" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/folders/[id] — Update a folder
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const { data, error } = await supabaseAdmin
      .from("folders")
      .update(updateData)
      .eq("id", id)
      .eq("created_by", profile.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Update folder error:", error);
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/folders/[id] — Delete a folder (lessons get folder_id set to null)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("folders")
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
    console.error("Delete folder error:", error);
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 },
    );
  }
}
