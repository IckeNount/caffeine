// ── OCR Types ───────────────────────────────────────────────────────

/** OCR provider: "tesseract" (free, client-side) or "gemini" (paid, server-side). */
export type OcrProvider = "tesseract" | "gemini";

/** Result returned by the OCR service after extracting text from an image. */
export interface OcrResult {
  /** The full extracted text, joined with newlines between paragraphs. */
  text: string;

  /** Individual paragraphs/blocks detected in the image. */
  paragraphs: string[];

  /** Confidence score from 0–1 (1 = highly confident). */
  confidence: number;

  /** Primary language detected in the extracted text. */
  detectedLanguage: string;

  /** Processing time in milliseconds. */
  processingTimeMs: number;
}

/** Options for customizing OCR extraction behavior. */
export interface OcrOptions {
  /** Language hint to improve accuracy (default: "en"). */
  languageHint?: string;

  /**
   * Extraction mode:
   * - "text"    → raw text only (fastest)
   * - "smart"   → contextual extraction (ignores headers, page numbers, artifacts)
   */
  mode?: "text" | "smart";
}

/** Structured error for OCR failures. */
export class OcrError extends Error {
  constructor(
    message: string,
    public readonly code: OcrErrorCode,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "OcrError";
  }
}

export type OcrErrorCode =
  | "INVALID_IMAGE"
  | "IMAGE_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "EXTRACTION_FAILED"
  | "API_ERROR"
  | "NO_TEXT_FOUND";

/** Supported image MIME types. */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Maximum image file size in bytes (10 MB). */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
