import { NextRequest, NextResponse } from "next/server";
import {
  transcribeAudio,
  TranscriptionError,
  MAX_AUDIO_SIZE,
} from "@/shared/lib/transcription";
import type { TranscriptionModel } from "@/shared/lib/transcription";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;
    const model = (formData.get("model") as TranscriptionModel) || "whisper-large-v3-turbo";

    // ── Validate file presence ────────────────────────────────────
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided. Please upload an MP3, WAV, M4A, OGG, FLAC, or WebM file." },
        { status: 400 }
      );
    }

    // ── Validate file type ────────────────────────────────────────
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Please upload an audio file.` },
        { status: 400 }
      );
    }

    // ── Validate file size ────────────────────────────────────────
    if (file.size > MAX_AUDIO_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File is too large (${sizeMB} MB). Maximum size is 25 MB.` },
        { status: 400 }
      );
    }

    // ── Transcribe ────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await transcribeAudio(buffer, file.type, { model });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Transcription API Error:", error);

    if (error instanceof TranscriptionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to transcribe audio. Please try again." },
      { status: 500 }
    );
  }
}
