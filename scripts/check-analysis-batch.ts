import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createBatchPlan } from "../src/features/lingubreak/lib/batch-plan";
import {
  BatchAnalysisResponseSchema,
  estimateBatchText,
  normalizeBatchSentences,
} from "../src/features/lingubreak/lib/batch-schema";
import { hashSentence } from "../src/features/lingubreak/lib/analysis-cache";
import { analyzeSentenceBatch } from "../src/features/lingubreak/lib/batch-analysis";
import type { AnalysisResult } from "../src/features/lingubreak/lib/schema";

const result: AnalysisResult = {
  chunks: [],
  simplified_english: "A student learns.",
  thai_translation: "นักเรียนเรียนรู้",
  thai_reordered_chunks: [],
  pedagogical_steps: [],
};

assert.deepEqual(normalizeBatchSentences([" One. ", "One.", "Two."]), [
  "One.",
  "Two.",
]);
assert.throws(() =>
  normalizeBatchSentences(Array.from({ length: 11 }, (_, index) => `Sentence ${index}.`)),
);
assert.throws(() => normalizeBatchSentences(["x".repeat(501)]));
assert.equal(estimateBatchText(["A short sentence."]).sentenceCount, 1);
assert.equal(estimateBatchText(Array.from({ length: 8 }, () => "Sentence.")).level, "High");
assert.deepEqual(
  createBatchPlan(["One.", "Two."], new Map([["One.", result]])).uncachedSentences,
  ["Two."],
);
assert.equal(hashSentence("the student learns."), "mgt8ad");
const retrieverSource = readFileSync(
  join(process.cwd(), "src/shared/lib/rag/retriever.ts"),
  "utf8",
);
const batchSource = readFileSync(
  join(process.cwd(), "src/features/lingubreak/lib/batch-analysis.ts"),
  "utf8",
);
assert.match(retrieverSource, /embedBatch\(sentences\)/);
assert.match(batchSource, /generateEmbeddingIfMissing:\s*false/);
assert.equal(
  BatchAnalysisResponseSchema.safeParse({
    items: [{ sentence: "One.", result, source: "cache" }],
    usage: {
      generatedSentences: 0,
      cachedSentences: 1,
      promptTokens: null,
      outputTokens: null,
      totalTokens: null,
    },
  }).success,
  true,
);

async function checkOrchestration() {
  let generationCalls = 0;
  const orchestrated = await analyzeSentenceBatch(
    ["Cached.", "New one.", "New two."],
    {
      loadCached: async () => new Map([["Cached.", result]]),
      buildContexts: async (sentences) =>
        sentences.map((sentence) => ({
          sentence,
          context: "",
          chunkIds: [],
          embedding: null,
          ragTraceJson: null,
        })),
      generate: async (items) => {
        generationCalls += 1;
        return {
          items: items.map(({ id }) => ({ id, result })),
          usage: { promptTokens: 42, outputTokens: 84, totalTokens: 126 },
        };
      },
      saveGenerated: async () => {},
    },
  );
  assert.equal(generationCalls, 1);
  assert.equal(orchestrated.usage.cachedSentences, 1);
  assert.equal(orchestrated.usage.generatedSentences, 2);
  assert.deepEqual(
    orchestrated.items.map(({ sentence }) => sentence),
    ["Cached.", "New one.", "New two."],
  );

  let allCachedGenerationCalls = 0;
  const allCached = await analyzeSentenceBatch(["Cached."], {
    loadCached: async () => new Map([["Cached.", result]]),
    buildContexts: async () => {
      throw new Error("RAG should not run for an all-cached batch.");
    },
    generate: async () => {
      allCachedGenerationCalls += 1;
      throw new Error("Gemini should not run for an all-cached batch.");
    },
    saveGenerated: async () => {},
  });
  assert.equal(allCachedGenerationCalls, 0);
  assert.equal(allCached.usage.generatedSentences, 0);
  assert.equal(allCached.items[0].source, "cache");
  console.log("check:analysis-batch OK");
}

checkOrchestration().catch((error) => {
  console.error(error);
  process.exit(1);
});
