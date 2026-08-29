import type { RagTraceJson } from "@/shared/lib/rag/retriever";
import { cacheAnalysis, getCachedAnalyses } from "./analysis-cache";
import {
  analyzeWithGeminiBatch,
  GEMINI_ANALYSIS_MODEL,
  type GeminiBatchInput,
  type GeminiBatchResult,
} from "./ai-providers";
import { createBatchPlan } from "./batch-plan";
import {
  BatchAnalysisResponseSchema,
  normalizeBatchSentences,
  type BatchAnalysisResponse,
  type BatchProviderItem,
} from "./batch-schema";
import { DEFAULT_AI_PROVIDER } from "./providers";
import type { AnalysisResult } from "./schema";

export interface BatchContext {
  sentence: string;
  context: string;
  chunkIds: string[];
  embedding: number[] | null;
  ragTraceJson: RagTraceJson | null;
}

interface SaveGeneratedInput extends BatchContext {
  result: AnalysisResult;
}

export interface BatchAnalysisDependencies {
  loadCached: (sentences: string[]) => Promise<Map<string, AnalysisResult>>;
  buildContexts: (sentences: string[]) => Promise<BatchContext[]>;
  generate: (items: GeminiBatchInput[]) => Promise<GeminiBatchResult>;
  saveGenerated: (input: SaveGeneratedInput) => Promise<void>;
}

function emptyContext(sentence: string): BatchContext {
  return {
    sentence,
    context: "",
    chunkIds: [],
    embedding: null,
    ragTraceJson: null,
  };
}

const productionBatchDependencies: BatchAnalysisDependencies = {
  loadCached: (sentences) => getCachedAnalyses(sentences, DEFAULT_AI_PROVIDER),
  buildContexts: async (sentences) => {
    try {
      const { buildRAGContexts } = await import("@/shared/lib/rag/retriever");
      return await buildRAGContexts(sentences);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      console.warn(`⚠️  Batch RAG unavailable (${reason}) — using prompt-only mode`);
      return sentences.map(emptyContext);
    }
  },
  generate: analyzeWithGeminiBatch,
  saveGenerated: (input) =>
    cacheAnalysis({
      sentence: input.sentence,
      provider: DEFAULT_AI_PROVIDER,
      llmModel: GEMINI_ANALYSIS_MODEL,
      result: input.result,
      chunkIds: input.chunkIds,
      embedding: input.embedding,
      ragTraceJson: input.ragTraceJson,
      generateEmbeddingIfMissing: false,
    }),
};

function validatedGeneratedById(
  items: BatchProviderItem[],
  expectedIds: string[],
): Map<string, AnalysisResult> {
  const byId = new Map<string, AnalysisResult>();
  for (const item of items) {
    if (byId.has(item.id)) throw new Error("Gemini returned a duplicate batch item.");
    byId.set(item.id, item.result);
  }
  if (
    byId.size !== expectedIds.length ||
    expectedIds.some((id) => !byId.has(id)) ||
    [...byId.keys()].some((id) => !expectedIds.includes(id))
  ) {
    throw new Error("Gemini returned an incomplete batch result.");
  }
  return byId;
}

export async function analyzeSentenceBatch(
  rawSentences: unknown,
  dependencies: BatchAnalysisDependencies = productionBatchDependencies,
): Promise<BatchAnalysisResponse> {
  const sentences = normalizeBatchSentences(rawSentences);
  const cached = await dependencies.loadCached(sentences);
  const plan = createBatchPlan(sentences, cached);

  if (plan.uncachedSentences.length === 0) {
    return BatchAnalysisResponseSchema.parse({
      items: plan.orderedSentences.map((sentence) => ({
        sentence,
        result: cached.get(sentence),
        source: "cache" as const,
      })),
      usage: {
        generatedSentences: 0,
        cachedSentences: plan.orderedSentences.length,
        promptTokens: null,
        outputTokens: null,
        totalTokens: null,
      },
    });
  }

  const builtContexts = await dependencies.buildContexts(plan.uncachedSentences);
  const contextBySentence = new Map(
    builtContexts.map((context) => [context.sentence, context]),
  );
  const contexts = plan.uncachedSentences.map(
    (sentence) => contextBySentence.get(sentence) ?? emptyContext(sentence),
  );
  const providerInputs = contexts.map((context, index) => ({
    id: `s${index}`,
    sentence: context.sentence,
    ragContext: context.context,
  }));
  const generated = await dependencies.generate(providerInputs);
  const generatedById = validatedGeneratedById(
    generated.items,
    providerInputs.map(({ id }) => id),
  );
  const generatedBySentence = new Map<string, AnalysisResult>();

  contexts.forEach((context, index) => {
    const result = generatedById.get(`s${index}`);
    if (!result) throw new Error("Gemini returned an incomplete batch result.");
    generatedBySentence.set(context.sentence, result);
  });

  void Promise.allSettled(
    contexts.map((context) =>
      dependencies.saveGenerated({
        ...context,
        result: generatedBySentence.get(context.sentence)!,
      }),
    ),
  );

  return BatchAnalysisResponseSchema.parse({
    items: plan.orderedSentences.map((sentence) => {
      const cachedResult = cached.get(sentence);
      return cachedResult
        ? { sentence, result: cachedResult, source: "cache" as const }
        : {
            sentence,
            result: generatedBySentence.get(sentence),
            source: "generated" as const,
          };
    }),
    usage: {
      generatedSentences: plan.uncachedSentences.length,
      cachedSentences: plan.orderedSentences.filter((sentence) => cached.has(sentence)).length,
      ...generated.usage,
    },
  });
}
