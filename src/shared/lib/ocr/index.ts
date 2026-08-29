// Browser-safe OCR contracts and local implementation.
// Server-only adapters must be imported from their concrete modules.

export { extractTextLocal } from "./tesseract-ocr";
export { validateImageBytes, imageMimeTypeFromPath } from "./image-validation";
export {
  OcrModeSchema,
  OcrProviderSchema,
  OcrResultSchema,
  CloudOcrRequestOptionsSchema,
} from "./ocr-schema";
export {
  type OcrResult,
  type OcrOptions,
  type OcrProvider,
  type OcrErrorCode,
  OcrError,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_DIMENSION,
} from "./ocr-types";
