"use client";

import Tesseract from "tesseract.js";
import type { OcrResult } from "./ocr-types";

/**
 * Extract text from an image entirely client-side using Tesseract.js.
 *
 * No API key, no server call, no quota — runs in the browser via WebAssembly.
 * Accuracy: 85–92% on clean, well-lit English text.
 *
 * @example
 * ```ts
 * import { extractTextLocal } from '@/shared/lib/ocr/tesseract-ocr';
 *
 * const result = await extractTextLocal(imageFile, (p) => console.log(p));
 * console.log(result.text);
 * ```
 */
export async function extractTextLocal(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  const start = Date.now();

  // Convert File to an image source Tesseract.js can consume
  const imageUrl = URL.createObjectURL(imageFile);

  try {
    const result = await Tesseract.recognize(imageUrl, "eng", {
      logger: (info) => {
        // Report progress for the "recognizing text" phase
        if (info.status === "recognizing text" && onProgress) {
          onProgress(Math.round(info.progress * 100));
        }
      },
    });

    const { data } = result;

    // Split into paragraphs by double newlines, filter empties
    const rawText = data.text.trim();
    const paragraphs = rawText
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0 || rawText.length === 0) {
      return {
        text: "",
        paragraphs: [],
        confidence: 0,
        detectedLanguage: "en",
        processingTimeMs: Date.now() - start,
      };
    }

    return {
      text: paragraphs.join("\n\n"),
      paragraphs,
      confidence: Math.max(0, Math.min(1, (data.confidence ?? 80) / 100)),
      detectedLanguage: "en",
      processingTimeMs: Date.now() - start,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
