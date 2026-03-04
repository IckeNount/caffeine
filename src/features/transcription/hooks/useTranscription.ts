"use client";

import { useState, useCallback } from "react";
import type {
  TranscriptionResult,
  TranscriptionModel,
} from "@/shared/lib/transcription";

/** Extended result with saved ID from the database. */
export interface TranscriptionResultWithId extends TranscriptionResult {
  savedId?: string;
  audioPath?: string;
}

interface UseTranscriptionReturn {
  result: TranscriptionResultWithId | null;
  isLoading: boolean;
  error: string | null;
  uploadAndTranscribe: (file: File, model?: TranscriptionModel) => Promise<void>;
  saveEdits: (editedText: string) => Promise<void>;
  reset: () => void;
}

/**
 * React hook for audio transcription via the /api/transcriptions endpoint.
 * Now auto-saves to the database after successful transcription.
 *
 * @example
 * ```tsx
 * const { result, isLoading, error, uploadAndTranscribe, saveEdits, reset } = useTranscription();
 * ```
 */
export function useTranscription(): UseTranscriptionReturn {
  const [result, setResult] = useState<TranscriptionResultWithId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAndTranscribe = useCallback(
    async (file: File, model: TranscriptionModel = "whisper-large-v3-turbo") => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("audio", file);
        formData.append("model", model);

        // Use the combined transcribe + save endpoint
        const response = await fetch("/api/transcriptions", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Transcription failed");
        }

        setResult(data as TranscriptionResultWithId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Save edited text to the database.
   */
  const saveEdits = useCallback(
    async (editedText: string) => {
      if (!result?.savedId) return;

      try {
        const response = await fetch(`/api/transcriptions/${result.savedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edited_text: editedText }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to save edits");
        }
      } catch (err) {
        console.error("[Save Edits Error]", err);
        // Non-blocking — don't disrupt the UI
      }
    },
    [result?.savedId]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { result, isLoading, error, uploadAndTranscribe, saveEdits, reset };
}
