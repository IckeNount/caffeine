import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

// GET /api/admin/translate/status/[jobId] — Poll translation job progress
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireTeacher();
    const { jobId } = await params;

    const { data: job, error } = await supabaseAdmin
      .from("translation_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("created_by", profile.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      provider: job.provider,
      totalSegments: job.total_segments,
      completedSegments: job.completed_segments,
      progress:
        job.total_segments > 0
          ? Math.round((job.completed_segments / job.total_segments) * 100)
          : 0,
      results: job.results,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "Failed to get job status" },
      { status: 500 },
    );
  }
}
