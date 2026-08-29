import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Tesseract from "tesseract.js";
import { validateImageBytes } from "./image-validation";
import { normalizeTesseractResult } from "./normalize-result";
import type { OcrResult } from "./ocr-types";

export async function extractTextWithTesseractNode(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<OcrResult> {
  validateImageBytes(imageBuffer, mimeType);
  const start = Date.now();
  const cachePath = path.join(tmpdir(), "caffeine-tesseract-cache");
  await mkdir(cachePath, { recursive: true });
  const result = await Tesseract.recognize(imageBuffer, "eng", { cachePath });
  return normalizeTesseractResult(
    result.data.text,
    result.data.confidence,
    Date.now() - start,
  );
}
