// ── Transcription Types ─────────────────────────────────────────────

/** Available Groq Whisper models. */
export type TranscriptionModel =
  | "whisper-large-v3-turbo"  // Fast & cheap ($0.04/hr) — default
  | "whisper-large-v3";       // High accuracy ($0.111/hr)

/** A single time-stamped segment from the transcription. */
export interface TranscriptionSegment {
  /** Segment index. */
  id: number;
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
  /** Transcribed text for this segment. */
  text: string;
}

/** Result returned by the transcription service. */
export interface TranscriptionResult {
  /** Full transcribed text. */
  text: string;

  /** Time-stamped segments (if verbose_json format was used). */
  segments: TranscriptionSegment[];

  /** Duration of the audio in seconds (from Groq response). */
  duration: number;

  /** Detected or specified language code (e.g. "en"). */
  language: string;

  /** Model that was used for transcription. */
  model: TranscriptionModel;

  /** Processing time in milliseconds (client-measured). */
  processingTimeMs: number;
}

/** Options for customizing transcription behavior. */
export interface TranscriptionOptions {
  /** Which Whisper model to use (default: "whisper-large-v3-turbo"). */
  model?: TranscriptionModel;

  /** Language hint — "en" for English (default). */
  language?: string;

  /**
   * Optional text to guide the model's style or continue a previous segment.
   * Useful for domain-specific vocabulary.
   */
  prompt?: string;

  /** Sampling temperature (0–1). Lower = more deterministic. Default: 0. */
  temperature?: number;
}

/** Structured error for transcription failures. */
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: TranscriptionErrorCode,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export type TranscriptionErrorCode =
  | "INVALID_AUDIO"
  | "AUDIO_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "TRANSCRIPTION_FAILED"
  | "API_ERROR"
  | "NO_SPEECH_FOUND";

/** Supported audio MIME types (Groq / Whisper compatible). */
export const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",       // .mp3
  "audio/mp4",        // .mp4
  "audio/mp4a-latm",  // .m4a (alternative)
  "audio/x-m4a",      // .m4a
  "audio/wav",        // .wav
  "audio/x-wav",      // .wav (alternative)
  "audio/ogg",        // .ogg
  "audio/flac",       // .flac
  "audio/webm",       // .webm
] as const;

/** File extensions accepted by the uploader. */
export const ACCEPTED_AUDIO_EXTENSIONS = ".mp3,.mp4,.m4a,.wav,.ogg,.flac,.webm";

/** Maximum audio file size in bytes — 25 MB (Groq free-tier limit). */
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

/** Summary for list view (subset of fields, client-safe). */
export interface TranscriptionSummary {
  id: string;
  title: string | null;
  duration: number;
  model: string;
  created_at: string;
}
