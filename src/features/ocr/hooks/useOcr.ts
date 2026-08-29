"use client";

import { useState, useCallback } from "react";
import {
  OcrError,
  OcrResultSchema,
  type OcrProvider,
  type OcrResult,
} from "@/shared/lib/ocr";

interface UseOcrReturn {
  /** Extracted text after OCR completes. */
  result: OcrResult | null;
  /** Whether an OCR request is in progress. */
  isLoading: boolean;
  /** Error message if the request failed. */
  error: string | null;
  /** Progress percentage (0–100) for Tesseract loading. Null when not applicable. */
  progress: number | null;
  activeProvider: OcrProvider | null;
  /** Upload a file and extract text from it. */
  uploadAndExtract: (
    file: File,
    provider?: OcrProvider,
    cloudConsent?: boolean,
  ) => Promise<OcrResult | null>;
  /** Reset all state to initial. */
  reset: () => void;
}

/**
 * React hook for client-side OCR workflow.
 *
 * @example
 * ```tsx
 * const { result, isLoading, progress, uploadAndExtract } = useOcr();
 * ```
 */
export function useOcr(): UseOcrReturn {
  const [result, setResult] = useState<OcrResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [activeProvider, setActiveProvider] = useState<OcrProvider | null>(null);

  const uploadAndExtract = useCallback(
    async (
      file: File,
      provider: OcrProvider = "tesseract",
      cloudConsent = false,
    ) => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setProgress(null);
      setActiveProvider(provider);

      try {
        if (provider === "tesseract") {
          // ── Client-side OCR (free) ──────────────────────────────
          const { extractTextLocal } = await import(
            "@/shared/lib/ocr/tesseract-ocr"
          );
          const data = await extractTextLocal(file, (p) => setProgress(p));

          const parsed = OcrResultSchema.parse(data);
          setResult(parsed);
          return parsed;
        } else {
          if (!cloudConsent) {
            throw new OcrError(
              "Cloud OCR requires explicit consent.",
              "CLOUD_CONSENT_REQUIRED",
              400,
            );
          }
          // ── Server-side OCR via Gemini (paid, opt-in) ───────────
          const formData = new FormData();
          formData.append("image", file);
          formData.append("mode", "smart");
          formData.append("cloudConsent", "true");

          const response = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "Failed to extract text from image."
            );
          }

          const parsed = OcrResultSchema.parse(data);
          setResult(parsed);
          return parsed;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
        setProgress(null);
        setActiveProvider(null);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setIsLoading(false);
    setError(null);
    setProgress(null);
    setActiveProvider(null);
  }, []);

  return {
    result,
    isLoading,
    error,
    progress,
    activeProvider,
    uploadAndExtract,
    reset,
  };
}
