"use client";

import Tesseract from "tesseract.js";
import { validateImageBytes } from "./image-validation";
import { normalizeTesseractResult } from "./normalize-result";
import type { OcrResult } from "./ocr-types";

/**
 * Extract text from an image entirely client-side using Tesseract.js.
 *
 * No API key, no server call, no quota — runs in the browser via WebAssembly.
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
  const bytes = new Uint8Array(await imageFile.arrayBuffer());
  validateImageBytes(bytes, imageFile.type);

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

    return normalizeTesseractResult(
      result.data.text,
      result.data.confidence,
      Date.now() - start,
    );
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
