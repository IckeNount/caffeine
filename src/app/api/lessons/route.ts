import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

// GET /api/lessons — List published lessons (student-facing, cacheable)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folder_id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabaseAdmin
      .from("lessons")
      .select(
        "id, title, status, tags, difficulty, folder_id, published_at, folder:folders(id, name, color), segments:lesson_segments(count)",
        { count: "exact" },
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) query = query.eq("folder_id", folderId);

    const { data, error, count } = await query;

    if (error) throw error;

    const response = NextResponse.json({ lessons: data, total: count });

    // Cache for 60s, serve stale for 5 more minutes while revalidating
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );

    return response;
  } catch (error) {
    console.error("List published lessons error:", error);
    return NextResponse.json(
      { error: "Failed to load lessons" },
      { status: 500 },
    );
  }
}
