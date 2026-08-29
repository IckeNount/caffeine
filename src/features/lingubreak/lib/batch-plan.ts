import type { AnalysisResult } from "./schema";

export interface BatchPlan {
  orderedSentences: string[];
  uncachedSentences: string[];
}

export function createBatchPlan(
  sentences: string[],
  cachedBySentence: Map<string, AnalysisResult>,
): BatchPlan {
  return {
    orderedSentences: sentences,
    uncachedSentences: sentences.filter((sentence) => !cachedBySentence.has(sentence)),
  };
}
