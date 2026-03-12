import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";
import { type TranslationProvider } from "@/shared/lib/translation";

// POST /api/admin/translate/bulk — Submit a bulk translation job
// Creates a job record and triggers background processing
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireTeacher();
    const {
      lesson_id,
      segment_ids,
      provider = "gemini",
    } = await request.json();

    if (!lesson_id) {
      return NextResponse.json(
        { error: "lesson_id is required" },
        { status: 400 },
      );
    }

    // Verify lesson ownership
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("id", lesson_id)
      .eq("created_by", profile.id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Get segments to translate
    let segmentsQuery = supabaseAdmin
      .from("lesson_segments")
      .select("id, original_text")
      .eq("lesson_id", lesson_id)
      .order("sort_order", { ascending: true });

    // If specific segment IDs are provided, filter to those
    if (segment_ids && Array.isArray(segment_ids) && segment_ids.length > 0) {
      segmentsQuery = segmentsQuery.in("id", segment_ids);
    }

    const { data: segments, error: segError } = await segmentsQuery;

    if (segError || !segments || segments.length === 0) {
      return NextResponse.json(
        { error: "No segments found to translate" },
        { status: 400 },
      );
    }

    const validProviders: TranslationProvider[] = ["gemini", "deepseek"];
    const selectedProvider: TranslationProvider = validProviders.includes(
      provider,
    )
      ? provider
      : "gemini";

    // Create translation job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("translation_jobs")
      .insert({
        lesson_id,
        created_by: profile.id,
        provider: selectedProvider,
        status: "pending",
        total_segments: segments.length,
        completed_segments: 0,
        results: [],
      })
      .select()
      .single();

    if (jobError || !job) {
      throw jobError || new Error("Failed to create job");
    }

    // Trigger background processing via Supabase Edge Function
    // For now, process inline with a smaller batch approach
    // TODO: Replace with actual Supabase Edge Function invocation when deployed
    processJobInBackground(job.id, segments, selectedProvider).catch((err) => {
      console.error(`Background job ${job.id} failed:`, err);
    });

    return NextResponse.json(
      {
        jobId: job.id,
        totalSegments: segments.length,
        provider: selectedProvider,
        estimatedSeconds: Math.ceil(segments.length / 5) * 6, // ~6s per batch of 5
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Bulk translate error:", error);
    return NextResponse.json(
      { error: "Failed to start bulk translation" },
      { status: 500 },
    );
  }
}

/**
 * Process translation job in the background.
 * This runs detached from the HTTP response — the teacher polls for status.
 * In production, this should be a Supabase Edge Function for longer timeout.
 */
async function processJobInBackground(
  jobId: string,
  segments: { id: string; original_text: string }[],
  provider: TranslationProvider,
) {
  const { translateSentence } = await import("@/shared/lib/translation");

  // Mark job as processing
  await supabaseAdmin
    .from("translation_jobs")
    .update({ status: "processing" })
    .eq("id", jobId);

  const results: Array<{
    segment_id: string;
    original: string;
    translation: string;
    success: boolean;
    error?: string;
  }> = [];

  const BATCH_SIZE = 5;
  const DELAY_MS = 1000;

  try {
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((seg) => translateSentence(seg.original_text, provider)),
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const segment = batch[j];

        if (result.status === "fulfilled") {
          results.push({
            segment_id: segment.id,
            original: segment.original_text,
            translation: result.value.translation,
            success: true,
          });
        } else {
          results.push({
            segment_id: segment.id,
            original: segment.original_text,
            translation: "",
            success: false,
            error: result.reason?.message || "Translation failed",
          });
        }
      }

      // Update progress
      await supabaseAdmin
        .from("translation_jobs")
        .update({
          completed_segments: Math.min(i + BATCH_SIZE, segments.length),
          results,
        })
        .eq("id", jobId);

      // Rate limit delay between batches
      if (i + BATCH_SIZE < segments.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    // Mark completed
    await supabaseAdmin
      .from("translation_jobs")
      .update({
        status: "completed",
        completed_segments: segments.length,
        results,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (error) {
    // Mark failed
    await supabaseAdmin
      .from("translation_jobs")
      .update({
        status: "failed",
        results,
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", jobId);
  }
}
