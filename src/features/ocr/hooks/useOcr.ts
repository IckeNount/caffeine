"use client";

import { useState, useCallback } from "react";
import type { OcrResult, OcrProvider } from "@/shared/lib/ocr";

interface UseOcrReturn {
  /** Extracted text after OCR completes. */
  result: OcrResult | null;
  /** Whether an OCR request is in progress. */
  isLoading: boolean;
  /** Error message if the request failed. */
  error: string | null;
  /** Progress percentage (0–100) for Tesseract loading. Null when not applicable. */
  progress: number | null;
  /** Upload a file and extract text from it. */
  uploadAndExtract: (file: File) => Promise<void>;
  /** Reset all state to initial. */
  reset: () => void;
}

/**
 * React hook for client-side OCR workflow.
 *
 * @param provider - "tesseract" (free, default) or "gemini" (paid, opt-in)
 *
 * @example
 * ```tsx
 * const { result, isLoading, progress, uploadAndExtract } = useOcr("tesseract");
 * ```
 */
export function useOcr(provider: OcrProvider = "tesseract"): UseOcrReturn {
  const [result, setResult] = useState<OcrResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const uploadAndExtract = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setProgress(null);

      try {
        if (provider === "tesseract") {
          // ── Client-side OCR (free) ──────────────────────────────
          const { extractTextLocal } = await import(
            "@/shared/lib/ocr/tesseract-ocr"
          );
          const data = await extractTextLocal(file, (p) => setProgress(p));

          if (!data.text) {
            throw new Error(
              "No text detected in the image. Try a clearer image with visible English text."
            );
          }

          setResult(data);
        } else {
          // ── Server-side OCR via Gemini (paid, opt-in) ───────────
          const formData = new FormData();
          formData.append("image", file);
          formData.append("mode", "smart");

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

          setResult(data as OcrResult);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setIsLoading(false);
        setProgress(null);
      }
    },
    [provider]
  );

  const reset = useCallback(() => {
    setResult(null);
    setIsLoading(false);
    setError(null);
    setProgress(null);
  }, []);

  return { result, isLoading, error, progress, uploadAndExtract, reset };
}
