import { z } from "zod";

export const OcrModeSchema = z.enum(["text", "smart"]);
export const OcrProviderSchema = z.enum(["tesseract", "gemini"]);

export const OcrResultSchema = z
  .object({
    text: z.string().trim().min(1).max(100_000),
    paragraphs: z.array(z.string().trim().min(1).max(25_000)).min(1).max(500),
    confidence: z.number().min(0).max(1),
    detectedLanguage: z.string().trim().min(1).max(35),
    processingTimeMs: z.number().nonnegative(),
    provider: OcrProviderSchema,
  })
  .strict();

export const CloudOcrRequestOptionsSchema = z
  .object({
    mode: OcrModeSchema.default("smart"),
    cloudConsent: z.literal(true),
  })
  .strict();

export type ParsedOcrResult = z.infer<typeof OcrResultSchema>;
