import { supabaseAdmin } from "@/shared/lib/db/supabase";
import type {
  TranscriptionResult,
  TranscriptionSegment,
  TranscriptionSummary,
} from "./transcription-types";

// ── DB Row Types ────────────────────────────────────────────────────

/** Row shape from the transcriptions table. */
export interface TranscriptionRow {
  id: string;
  title: string | null;
  original_text: string;
  edited_text: string | null;
  segments: TranscriptionSegment[];
  duration: number;
  language: string;
  model: string;
  audio_path: string | null;
  audio_mime: string | null;
  processing_ms: number | null;
  created_at: string;
  updated_at: string;
}

// Re-export for convenience in API routes
export type { TranscriptionSummary };

// ── Audio Storage ───────────────────────────────────────────────────

const STORAGE_BUCKET = "transcription-audio";

function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/mp4a-latm": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/webm": "webm",
  };
  return map[mimeType] || "mp3";
}

/**
 * Upload audio to Supabase Storage.
 * Returns the storage path (e.g., "abc123.mp3").
 */
async function uploadAudio(
  id: string,
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeToExtension(mimeType);
  const path = `${id}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, new Uint8Array(audioBuffer), {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("[Storage Upload Error]", error);
    throw new Error(`Failed to upload audio: ${error.message}`);
  }

  return path;
}

/**
 * Get the public URL for a stored audio file.
 */
export function getAudioUrl(audioPath: string): string {
  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(audioPath);

  return data.publicUrl;
}

/**
 * Delete audio from Supabase Storage.
 */
async function deleteAudio(audioPath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([audioPath]);

  if (error) {
    console.error("[Storage Delete Error]", error);
    // Non-fatal: row is still deleted
  }
}

// ── CRUD Operations ─────────────────────────────────────────────────

/**
 * Save a transcription result to the database.
 * Optionally uploads audio to storage.
 */
export async function saveTranscription(
  result: TranscriptionResult,
  audioBuffer?: Buffer,
  mimeType?: string
): Promise<TranscriptionRow> {
  // Generate title from first ~50 chars of text
  const autoTitle =
    result.text.length > 50
      ? result.text.slice(0, 50).trim() + "…"
      : result.text.trim();

  // Insert row first to get the ID
  const { data: row, error } = await supabaseAdmin
    .from("transcriptions")
    .insert({
      title: autoTitle,
      original_text: result.text,
      segments: result.segments,
      duration: result.duration,
      language: result.language,
      model: result.model,
      processing_ms: result.processingTimeMs,
      audio_mime: mimeType || null,
    })
    .select()
    .single();

  if (error || !row) {
    console.error("[DB Save Error]", error);
    throw new Error(`Failed to save transcription: ${error?.message}`);
  }

  // Upload audio if provided
  if (audioBuffer && mimeType) {
    try {
      const audioPath = await uploadAudio(row.id, audioBuffer, mimeType);

      // Update row with audio path
      await supabaseAdmin
        .from("transcriptions")
        .update({ audio_path: audioPath })
        .eq("id", row.id);

      return { ...row, audio_path: audioPath } as TranscriptionRow;
    } catch (uploadError) {
      console.error("[Audio Upload Error]", uploadError);
      // Return row without audio — non-fatal
      return row as TranscriptionRow;
    }
  }

  return row as TranscriptionRow;
}

/**
 * List transcriptions, newest first. Paginated.
 */
export async function listTranscriptions(
  limit: number = 20,
  offset: number = 0
): Promise<{ items: TranscriptionSummary[]; total: number }> {
  const { data, error, count } = await supabaseAdmin
    .from("transcriptions")
    .select("id, title, duration, model, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[DB List Error]", error);
    throw new Error(`Failed to list transcriptions: ${error.message}`);
  }

  return {
    items: (data || []) as TranscriptionSummary[],
    total: count || 0,
  };
}

/**
 * Fetch a single transcription by ID.
 */
export async function getTranscription(
  id: string
): Promise<TranscriptionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("transcriptions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[DB Get Error]", error);
    throw new Error(`Failed to get transcription: ${error.message}`);
  }

  return data as TranscriptionRow;
}

/**
 * Update a transcription (edited text, title).
 */
export async function updateTranscription(
  id: string,
  updates: { edited_text?: string; title?: string }
): Promise<TranscriptionRow> {
  const { data, error } = await supabaseAdmin
    .from("transcriptions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[DB Update Error]", error);
    throw new Error(`Failed to update transcription: ${error?.message}`);
  }

  return data as TranscriptionRow;
}

/**
 * Delete a transcription and its audio file.
 */
export async function deleteTranscription(id: string): Promise<void> {
  // Get audio path before deleting
  const row = await getTranscription(id);

  const { error } = await supabaseAdmin
    .from("transcriptions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DB Delete Error]", error);
    throw new Error(`Failed to delete transcription: ${error.message}`);
  }

  // Clean up audio file
  if (row?.audio_path) {
    await deleteAudio(row.audio_path);
  }
}
