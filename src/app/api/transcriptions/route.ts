import { NextRequest, NextResponse } from "next/server";
import {
  listTranscriptions,
  saveTranscription,
} from "@/shared/lib/transcription/transcription-db";
import {
  transcribeAudio,
  TranscriptionError,
  MAX_AUDIO_SIZE,
} from "@/shared/lib/transcription";
import type { TranscriptionModel } from "@/shared/lib/transcription";

/**
 * GET /api/transcriptions — List all saved transcriptions (paginated).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await listTranscriptions(limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error("List Transcriptions Error:", error);
    return NextResponse.json(
      { error: "Failed to list transcriptions." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transcriptions — Transcribe audio AND auto-save to database.
 *
 * Combined endpoint: transcribes via Groq Whisper, then persists the result
 * (and audio file) to Supabase. Returns the saved row with its ID.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;
    const model = (formData.get("model") as TranscriptionModel) || "whisper-large-v3-turbo";

    // ── Validate ──────────────────────────────────────────────────
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${sizeMB} MB). Max 25 MB.` },
        { status: 400 }
      );
    }

    // ── Transcribe ────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transcriptionResult = await transcribeAudio(buffer, file.type, { model });

    // ── Save to DB + Storage ──────────────────────────────────────
    const savedRow = await saveTranscription(
      transcriptionResult,
      buffer,
      file.type
    );

    return NextResponse.json({
      ...transcriptionResult,
      savedId: savedRow.id,
      audioPath: savedRow.audio_path,
    });
  } catch (error) {
    console.error("Transcription + Save Error:", error);

    if (error instanceof TranscriptionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to transcribe and save audio." },
      { status: 500 }
    );
  }
}
