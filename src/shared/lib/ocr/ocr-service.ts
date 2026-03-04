import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  OcrResult,
  OcrOptions,
  OcrError,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from "./ocr-types";

// ── Prompts ─────────────────────────────────────────────────────────

const TEXT_PROMPT = `Extract ALL English text from this image exactly as it appears. 
Preserve paragraph breaks. Do not translate, summarize, or interpret — just extract the raw text.
If there is no text in the image, respond with exactly: __NO_TEXT__

Respond as JSON:
{
  "paragraphs": ["paragraph 1 text", "paragraph 2 text", ...],
  "confidence": 0.0 to 1.0,
  "detectedLanguage": "en"
}`;

const SMART_PROMPT = `Extract the main English body text from this image.
IGNORE: page numbers, headers, footers, watermarks, captions, and UI elements.
Preserve paragraph structure. Do not translate, summarize, or interpret.
If there is no meaningful text in the image, respond with exactly: __NO_TEXT__

Respond as JSON:
{
  "paragraphs": ["paragraph 1 text", "paragraph 2 text", ...],
  "confidence": 0.0 to 1.0,
  "detectedLanguage": "en"
}`;

// ── Validation ──────────────────────────────────────────────────────

/**
 * Validate an image buffer before sending it to the OCR API.
 * Throws OcrError if validation fails.
 */
export function validateImage(
  buffer: Buffer,
  mimeType: string
): void {
  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType as typeof SUPPORTED_IMAGE_TYPES[number])) {
    throw new OcrError(
      `Unsupported image format: ${mimeType}. Supported: JPEG, PNG, WebP.`,
      "UNSUPPORTED_FORMAT",
      400
    );
  }

  if (buffer.length === 0) {
    throw new OcrError("Image file is empty.", "INVALID_IMAGE", 400);
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    throw new OcrError(
      `Image is too large (${sizeMB} MB). Maximum size is 10 MB.`,
      "IMAGE_TOO_LARGE",
      400
    );
  }
}

// ── Core OCR Function ───────────────────────────────────────────────

/**
 * Extract text from an image using Gemini 2.0 Flash Vision.
 *
 * This is the primary function — call it from any API route or server action.
 *
 * @example
 * ```ts
 * import { extractText } from '@/shared/lib/ocr';
 *
 * const result = await extractText(imageBuffer, 'image/png');
 * console.log(result.text);
 * ```
 */
export async function extractText(
  imageBuffer: Buffer,
  mimeType: string,
  options: OcrOptions = {}
): Promise<OcrResult> {
  const { mode = "smart" } = options;
  const start = Date.now();

  // 1. Validate input
  validateImage(imageBuffer, mimeType);

  // 2. Initialize Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new OcrError(
      "Missing GEMINI_API_KEY environment variable.",
      "API_ERROR",
      500
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1, // Low temperature for faithful extraction
    },
  });

  // 3. Build the multimodal request
  const prompt = mode === "smart" ? SMART_PROMPT : TEXT_PROMPT;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType,
    },
  };

  // 4. Call Gemini Vision
  try {
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    // 5. Parse response
    const parsed = JSON.parse(responseText) as {
      paragraphs: string[];
      confidence: number;
      detectedLanguage: string;
    };

    // Check for "no text" sentinel
    if (
      !parsed.paragraphs ||
      parsed.paragraphs.length === 0 ||
      (parsed.paragraphs.length === 1 && parsed.paragraphs[0] === "__NO_TEXT__")
    ) {
      throw new OcrError(
        "No text was detected in the image. Please try a clearer image with visible English text.",
        "NO_TEXT_FOUND",
        422
      );
    }

    const processingTimeMs = Date.now() - start;

    return {
      text: parsed.paragraphs.join("\n\n"),
      paragraphs: parsed.paragraphs,
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.9)),
      detectedLanguage: parsed.detectedLanguage ?? "en",
      processingTimeMs,
    };
  } catch (error) {
    // Re-throw OcrErrors as-is
    if (error instanceof OcrError) throw error;

    // Extract error message
    const message =
      error instanceof Error ? error.message : "Unknown OCR error";

    console.error("OCR extraction failed:", message);

    // Detect quota / rate-limit errors from Gemini API
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes("quota") ||
      lowerMsg.includes("rate") ||
      lowerMsg.includes("429") ||
      lowerMsg.includes("resource has been exhausted") ||
      lowerMsg.includes("too many requests")
    ) {
      throw new OcrError(
        "Gemini API quota exceeded. Please wait a minute and try again, or check your API key's usage limits at https://aistudio.google.com.",
        "API_ERROR",
        429
      );
    }

    // Detect auth errors
    if (
      lowerMsg.includes("401") ||
      lowerMsg.includes("api key") ||
      lowerMsg.includes("unauthorized") ||
      lowerMsg.includes("permission")
    ) {
      throw new OcrError(
        "Invalid Gemini API key. Please check your GEMINI_API_KEY in .env.local.",
        "API_ERROR",
        401
      );
    }

    throw new OcrError(
      `Failed to extract text: ${message}`,
      "EXTRACTION_FAILED",
      500
    );
  }
}
