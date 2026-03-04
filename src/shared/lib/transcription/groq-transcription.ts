import Groq from "groq-sdk";
import {
  TranscriptionResult,
  TranscriptionOptions,
  TranscriptionError,
  TranscriptionSegment,
  SUPPORTED_AUDIO_TYPES,
  MAX_AUDIO_SIZE,
} from "./transcription-types";

// ── Validation ──────────────────────────────────────────────────────

/**
 * Validate an audio buffer before sending it to the Groq API.
 * Throws TranscriptionError if validation fails.
 */
export function validateAudio(buffer: Buffer, mimeType: string): void {
  // Check MIME type
  const isSupported = SUPPORTED_AUDIO_TYPES.some(
    (t) => mimeType === t || mimeType.startsWith(t.split("/")[0] + "/")
  );

  if (!isSupported && !mimeType.startsWith("audio/")) {
    throw new TranscriptionError(
      `Unsupported audio format: ${mimeType}. Supported: MP3, WAV, M4A, OGG, FLAC, WebM.`,
      "UNSUPPORTED_FORMAT",
      400
    );
  }

  if (buffer.length === 0) {
    throw new TranscriptionError(
      "Audio file is empty.",
      "INVALID_AUDIO",
      400
    );
  }

  if (buffer.length > MAX_AUDIO_SIZE) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    throw new TranscriptionError(
      `Audio file is too large (${sizeMB} MB). Maximum size is 25 MB (Groq free-tier limit).`,
      "AUDIO_TOO_LARGE",
      400
    );
  }
}

// ── MIME → extension mapping (Groq requires filename with extension) ─

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

// ── Core Transcription Function ─────────────────────────────────────

/**
 * Transcribe an audio file using Groq's Whisper API.
 *
 * This is the primary function — call it from any API route or server action.
 *
 * @example
 * ```ts
 * import { transcribeAudio } from '@/shared/lib/transcription';
 *
 * const result = await transcribeAudio(audioBuffer, 'audio/mpeg');
 * console.log(result.text);
 * ```
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const {
    model = "whisper-large-v3-turbo",
    language = "en",
    prompt,
    temperature = 0,
  } = options;

  const start = Date.now();

  // 1. Validate input
  validateAudio(audioBuffer, mimeType);

  // 2. Initialize Groq client
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new TranscriptionError(
      "Missing GROQ_API_KEY environment variable. Get a free key at https://console.groq.com",
      "API_ERROR",
      500
    );
  }

  const groq = new Groq({ apiKey });

  // 3. Build the File object for the API
  const extension = mimeToExtension(mimeType);
  const file = new File([new Uint8Array(audioBuffer)], `audio.${extension}`, {
    type: mimeType,
  });

  // 4. Call Groq Whisper API
  try {
    const response = await groq.audio.transcriptions.create({
      file,
      model,
      language,
      temperature,
      response_format: "verbose_json",
      ...(prompt ? { prompt } : {}),
    });

    const processingTimeMs = Date.now() - start;

    // 5. Parse segments from response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSegments = (response as any).segments || [];
    const segments: TranscriptionSegment[] = rawSegments.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (seg: any, idx: number) => ({
        id: seg.id ?? idx,
        start: seg.start ?? 0,
        end: seg.end ?? 0,
        text: (seg.text ?? "").trim(),
      })
    );

    const text = response.text?.trim() || "";

    // Check for empty transcription
    if (!text) {
      throw new TranscriptionError(
        "No speech was detected in the audio. Please try a clearer recording.",
        "NO_SPEECH_FOUND",
        422
      );
    }

    return {
      text,
      segments,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      duration: (response as any).duration ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      language: (response as any).language ?? language,
      model,
      processingTimeMs,
    };
  } catch (error) {
    // Re-throw TranscriptionErrors as-is
    if (error instanceof TranscriptionError) throw error;

    const message =
      error instanceof Error ? error.message : "Unknown transcription error";

    console.error("[Transcription Error]", message);

    // Detect quota / rate-limit errors
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes("quota") ||
      lowerMsg.includes("rate") ||
      lowerMsg.includes("429") ||
      lowerMsg.includes("too many requests") ||
      lowerMsg.includes("resource has been exhausted")
    ) {
      throw new TranscriptionError(
        "Groq API rate limit reached. Please wait a moment and try again. Free tier allows ~2,000 requests/day.",
        "API_ERROR",
        429
      );
    }

    // Detect auth errors
    if (
      lowerMsg.includes("401") ||
      lowerMsg.includes("api key") ||
      lowerMsg.includes("unauthorized") ||
      lowerMsg.includes("invalid") ||
      lowerMsg.includes("permission")
    ) {
      throw new TranscriptionError(
        "Invalid Groq API key. Please check your GROQ_API_KEY in .env.local. Get a free key at https://console.groq.com",
        "API_ERROR",
        401
      );
    }

    throw new TranscriptionError(
      `Transcription failed: ${message}`,
      "TRANSCRIPTION_FAILED",
      500
    );
  }
}
