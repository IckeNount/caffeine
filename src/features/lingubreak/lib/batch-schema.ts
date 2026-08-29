import { z } from "zod";
import { AnalysisResultSchema } from "./schema";

export const MAX_BATCH_SENTENCES = 10;
export const MAX_SENTENCE_CHARACTERS = 500;
export const MAX_BATCH_CHARACTERS = 5_000;

export class BatchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchInputError";
  }
}

export const BatchSentenceSchema = z.string().trim().min(1).max(MAX_SENTENCE_CHARACTERS);

export const BatchAnalysisRequestSchema = z
  .object({
    sentences: z.array(BatchSentenceSchema).min(1).max(MAX_BATCH_SENTENCES),
    provider: z.literal("gemini").default("gemini"),
  })
  .strict();

export const BatchAnalysisItemSchema = z.object({
  sentence: z.string(),
  result: AnalysisResultSchema,
  source: z.enum(["cache", "generated"]),
});

export const BatchAnalysisUsageSchema = z.object({
  generatedSentences: z.number().int().nonnegative(),
  cachedSentences: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
});

export const BatchAnalysisResponseSchema = z.object({
  items: z.array(BatchAnalysisItemSchema),
  usage: BatchAnalysisUsageSchema,
});

export const BatchProviderResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      result: AnalysisResultSchema,
    }),
  ),
});

export type BatchAnalysisItem = z.infer<typeof BatchAnalysisItemSchema>;
export type BatchAnalysisUsage = z.infer<typeof BatchAnalysisUsageSchema>;
export type BatchAnalysisResponse = z.infer<typeof BatchAnalysisResponseSchema>;
export type BatchProviderItem = z.infer<typeof BatchProviderResponseSchema>["items"][number];

function friendlyInputError(): BatchInputError {
  return new BatchInputError(
    "Please review 1–10 sentences at a time, with no sentence longer than 500 characters.",
  );
}

export function normalizeBatchSentences(values: unknown): string[] {
  const parsed = z.array(BatchSentenceSchema).min(1).max(MAX_BATCH_SENTENCES).safeParse(values);
  if (!parsed.success) throw friendlyInputError();

  const unique = [
    ...new Set(parsed.data.map((value) => value.replace(/\s+/g, " ").trim())),
  ];
  const characterCount = unique.reduce((sum, value) => sum + value.length, 0);

  if (
    unique.length === 0 ||
    unique.length > MAX_BATCH_SENTENCES ||
    characterCount > MAX_BATCH_CHARACTERS
  ) {
    throw friendlyInputError();
  }

  return unique;
}

export interface BatchTextEstimate {
  sentenceCount: number;
  textTokens: number;
  level: "Light" | "Medium" | "High";
}

export function estimateBatchText(sentences: string[]): BatchTextEstimate {
  const sentenceCount = sentences.length;
  const characters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  const level = sentenceCount <= 3 ? "Light" : sentenceCount <= 7 ? "Medium" : "High";

  return {
    sentenceCount,
    textTokens: Math.ceil(characters / 4),
    level,
  };
}
