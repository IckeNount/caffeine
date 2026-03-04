// Shared OCR service — barrel export
// Usage: import { extractText, OcrResult } from '@/shared/lib/ocr';

export { extractText, validateImage } from "./ocr-service";
export { extractTextLocal } from "./tesseract-ocr";
export {
  type OcrResult,
  type OcrOptions,
  type OcrProvider,
  type OcrErrorCode,
  OcrError,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from "./ocr-types";
