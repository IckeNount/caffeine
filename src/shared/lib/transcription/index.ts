// Shared Transcription service — barrel export
// Usage: import { transcribeAudio, TranscriptionResult } from '@/shared/lib/transcription';
//
// NOTE: Server-only CRUD functions (saveTranscription, listTranscriptions, etc.)
// are NOT exported here to avoid pulling supabaseAdmin into client bundles.
// API routes should import directly:
//   import { saveTranscription } from '@/shared/lib/transcription/transcription-db';

export { transcribeAudio, validateAudio } from "./groq-transcription";
export {
  type TranscriptionResult,
  type TranscriptionOptions,
  type TranscriptionModel,
  type TranscriptionSegment,
  type TranscriptionSummary,
  type TranscriptionErrorCode,
  TranscriptionError,
  SUPPORTED_AUDIO_TYPES,
  ACCEPTED_AUDIO_EXTENSIONS,
  MAX_AUDIO_SIZE,
} from "./transcription-types";
