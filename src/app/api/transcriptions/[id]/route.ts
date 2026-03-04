import { NextRequest, NextResponse } from "next/server";
import {
  getTranscription,
  updateTranscription,
  deleteTranscription,
  getAudioUrl,
} from "@/shared/lib/transcription/transcription-db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/transcriptions/[id] — Fetch a single transcription.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const row = await getTranscription(id);

    if (!row) {
      return NextResponse.json(
        { error: "Transcription not found." },
        { status: 404 }
      );
    }

    // Attach public audio URL if available
    const audioUrl = row.audio_path ? getAudioUrl(row.audio_path) : null;

    return NextResponse.json({ ...row, audioUrl });
  } catch (error) {
    console.error("Get Transcription Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcription." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/transcriptions/[id] — Update edited text or title.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates: { edited_text?: string; title?: string } = {};
    if (typeof body.edited_text === "string") updates.edited_text = body.edited_text;
    if (typeof body.title === "string") updates.title = body.title;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const updated = await updateTranscription(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Transcription Error:", error);
    return NextResponse.json(
      { error: "Failed to update transcription." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transcriptions/[id] — Delete transcription + audio.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteTranscription(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Transcription Error:", error);
    return NextResponse.json(
      { error: "Failed to delete transcription." },
      { status: 500 }
    );
  }
}
