import { z } from "zod";

export const DictionaryLookupResultSchema = z.object({
  word: z.string(),
  thaiMeaning: z.string(),
  phonetic: z.string().nullable(),
  partOfSpeech: z.string().nullable(),
  definition: z.string().nullable(),
  example: z.string().nullable(),
  audioUrl: z.string().url().nullable(),
  partial: z.boolean(),
  sources: z.object({
    thai: z.literal("MyMemory"),
    english: z.literal("Free Dictionary API").nullable(),
  }),
});

export type DictionaryLookupResult = z.infer<
  typeof DictionaryLookupResultSchema
>;

const WORD_PATTERN = /^[a-z]+(?:['’-][a-z]+)*$/i;

export function normalizeDictionaryWord(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 &&
    normalized.length <= 50 &&
    WORD_PATTERN.test(normalized)
    ? normalized
    : null;
}
