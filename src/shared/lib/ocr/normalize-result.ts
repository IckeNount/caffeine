import { OcrResultSchema } from "./ocr-schema";
import { OcrError, type OcrProvider, type OcrResult } from "./ocr-types";

export function normalizeOcrText(value: string): string[] {
  return value
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

export function normalizeTesseractResult(
  text: string,
  confidencePercent: number,
  processingTimeMs: number,
  provider: OcrProvider = "tesseract",
): OcrResult {
  const paragraphs = normalizeOcrText(text);
  if (paragraphs.length === 0) {
    throw new OcrError(
      "No readable English text was found. Try a clearer image or type the sentence manually.",
      "NO_TEXT_FOUND",
      422,
    );
  }

  return OcrResultSchema.parse({
    text: paragraphs.join("\n\n"),
    paragraphs,
    confidence: Math.max(0, Math.min(1, confidencePercent / 100)),
    detectedLanguage: "en",
    processingTimeMs,
    provider,
  });
}
