# Bilingual Analysis Progress and OCR Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the analysis spinner with bilingual progress guidance and turn reviewed OCR text into up to ten ready sentence breakdowns using one Gemini generation for all uncached sentences.

**Architecture:** Add strict batch contracts, isolate cache/RAG/provider orchestration behind injectable dependencies, and expose `POST /api/analyze-batch`. The OCR panel remains local and editable until one explicit batch action; returned `AnalysisResult` objects are held in client state and selected without another request.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Supabase/pgvector, OpenRouter batch embeddings, Gemini structured generation, Tailwind CSS v4, `tsx` contract checks.

## Global Constraints

- Thai and English progress copy must remain non-technical, with Thai visually primary.
- OCR never triggers analysis automatically.
- Accept 1-10 distinct sentences, at most 500 characters each and 5,000 sentence characters total.
- One Gemini generation request must contain every uncached sentence; never fall back to hidden per-sentence generation.
- Reuse cached analyses, preserve input order, and batch the uncached embeddings once.
- Usage shown before submission is an estimate of learner text size, not Gemini credits remaining.
- Ready-result selection must not call `/api/analyze` or `/api/analyze-batch`.
- Preserve the current `AnalysisResult` contract, RAG degradation behavior, OCR privacy boundary, and existing unrelated features.
- Browser automation is out of scope unless explicitly requested.

---

### Task 1: Batch contracts and deterministic planning

**Files:**
- Create: `src/features/lingubreak/lib/batch-schema.ts`
- Create: `src/features/lingubreak/lib/batch-plan.ts`
- Create: `scripts/check-analysis-batch.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizeBatchSentences(values: unknown): string[]`
- Produces: `estimateBatchText(sentences: string[]): { sentenceCount: number; textTokens: number; level: "Light" | "Medium" | "High" }`
- Produces: `BatchAnalysisRequestSchema`, `BatchAnalysisResponseSchema`, `BatchProviderResponseSchema`
- Produces: `createBatchPlan(sentences, cachedBySentence): { orderedSentences; uncachedSentences }`

- [x] **Step 1: Write failing contract assertions**

```ts
assert.deepEqual(normalizeBatchSentences([" One. ", "One.", "Two."]), ["One.", "Two."]);
assert.throws(() => normalizeBatchSentences(Array.from({ length: 11 }, (_, i) => `Sentence ${i}.`)));
assert.throws(() => normalizeBatchSentences(["x".repeat(501)]));
assert.equal(estimateBatchText(["A short sentence."]).sentenceCount, 1);
assert.deepEqual(createBatchPlan(["One.", "Two."], new Map([["One.", result]])).uncachedSentences, ["Two."]);
```

- [x] **Step 2: Run the new check and verify it fails**

Run: `npx tsx scripts/check-analysis-batch.ts`
Expected: FAIL because the batch modules do not exist.

- [x] **Step 3: Implement bounded schemas and pure planning**

```ts
export const BatchSentenceSchema = z.string().trim().min(1).max(500);
export const BatchAnalysisRequestSchema = z.object({
  sentences: z.array(BatchSentenceSchema).min(1).max(10),
  provider: z.literal("gemini").default("gemini"),
}).strict();

export function normalizeBatchSentences(values: unknown): string[] {
  const parsed = z.array(BatchSentenceSchema).min(1).parse(values);
  const unique = [...new Set(parsed.map((value) => value.replace(/\s+/g, " ").trim()))];
  if (unique.length > 10 || unique.reduce((sum, value) => sum + value.length, 0) > 5_000) {
    throw new BatchInputError("Review up to 10 sentences at a time.");
  }
  return unique;
}
```

- [x] **Step 4: Add `check:analysis-batch` and verify Task 1**

Run: `npm run check:analysis-batch`
Expected: `check:analysis-batch OK`.

---

### Task 2: Shared cache and batched RAG context

**Files:**
- Create: `src/features/lingubreak/lib/analysis-cache.ts`
- Modify: `src/features/lingubreak/lib/ai-providers.ts`
- Modify: `src/shared/lib/rag/retriever.ts`
- Modify: `scripts/check-analysis-batch.ts`

**Interfaces:**
- Produces: `hashSentence(sentence: string): string` with unchanged hash output
- Produces: `getCachedAnalyses(sentences, provider): Promise<Map<string, AnalysisResult>>`
- Produces: `cacheAnalysis(input: CacheAnalysisInput): Promise<void>`
- Produces: `buildRAGContexts(sentences: string[]): Promise<BatchRagContext[]>`

- [x] **Step 1: Lock the existing hash and batch-context behavior with assertions**

```ts
assert.equal(hashSentence("the student learns."), "mgt8ad");
assert.equal(batchEmbedCallCount, 1);
assert.equal(contexts.length, uncachedSentences.length);
```

The expected value was captured from the current private algorithm before extraction, preserving existing cache keys rather than inventing a new hash.

- [x] **Step 2: Extract cache helpers without changing the single path**

```ts
export interface CacheAnalysisInput {
  sentence: string;
  provider: AIProvider;
  llmModel: string;
  result: AnalysisResult;
  chunkIds: string[];
  embedding: number[] | null;
  ragTraceJson: RagTraceJson | null;
}

export async function getCachedAnalyses(
  sentences: string[],
  provider: AIProvider,
): Promise<Map<string, AnalysisResult>>;
```

The batch query must use `.in("sentence_hash", hashes).eq("provider", provider)` and validate every `result_json` before adding it to the map.

- [x] **Step 3: Refactor RAG formatting around precomputed embeddings**

```ts
export async function buildRAGContexts(sentences: string[]): Promise<BatchRagContext[]> {
  const embeddings = await embedBatch(sentences);
  return Promise.all(embeddings.map((embedding, index) =>
    buildContextFromEmbedding(sentences[index], embedding)
  ));
}
```

If the one batch embedding request fails, the caller supplies empty prompt-only contexts for every uncached sentence. Individual Supabase RPC errors remain empty context for only that sentence.

- [x] **Step 4: Verify single and batch contracts**

Run: `npm run check:analysis-batch && npm run typecheck`
Expected: both pass and the existing single analysis still imports the extracted cache helpers.

---

### Task 3: One-call Gemini batch orchestration and API route

**Files:**
- Create: `src/features/lingubreak/lib/batch-analysis.ts`
- Create: `src/app/api/analyze-batch/route.ts`
- Modify: `src/features/lingubreak/lib/ai-providers.ts`
- Modify: `scripts/check-analysis-batch.ts`
- Modify: `scripts/smoke-api.ts`
- Modify: `infra/gateway-routes.yaml`
- Modify: `infra/ROUTES.md`

**Interfaces:**
- Produces: `analyzeWithGeminiBatch(inputs): Promise<{ items; usage }>`
- Produces: `analyzeSentenceBatch(sentences, dependencies?): Promise<BatchAnalysisResponse>`
- HTTP: `POST /api/analyze-batch`

- [x] **Step 1: Add an injectable orchestration test**

```ts
let generationCalls = 0;
const response = await analyzeSentenceBatch(["Cached.", "New one.", "New two."], {
  loadCached: async () => new Map([["Cached.", result]]),
  buildContexts: async (sentences) => sentences.map(emptyContext),
  generate: async (items) => {
    generationCalls += 1;
    return providerResultFor(items);
  },
  saveGenerated: async () => {},
});
assert.equal(generationCalls, 1);
assert.equal(response.usage.cachedSentences, 1);
assert.deepEqual(response.items.map((item) => item.sentence), ["Cached.", "New one.", "New two."]);
```

- [x] **Step 2: Add the batch Gemini schema and prompt**

```ts
const batchGeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          result: geminiSchema,
        },
        required: ["id", "result"],
      },
    },
  },
  required: ["items"],
};
```

Use stable request IDs (`s0` through `s9`), require exactly one validated result for every requested ID, and return `usageMetadata.promptTokenCount`, `candidatesTokenCount`, and `totalTokenCount` when present.

- [x] **Step 3: Implement the orchestration boundary**

```ts
export async function analyzeSentenceBatch(
  rawSentences: unknown,
  deps: BatchAnalysisDependencies = productionBatchDependencies,
): Promise<BatchAnalysisResponse> {
  const sentences = normalizeBatchSentences(rawSentences);
  const cached = await deps.loadCached(sentences);
  const plan = createBatchPlan(sentences, cached);
  if (plan.uncachedSentences.length === 0) return allCachedResponse(plan, cached);
  const contexts = await deps.buildContexts(plan.uncachedSentences);
  const generated = await deps.generate(withStableIds(plan.uncachedSentences, contexts));
  validateCompleteProviderResult(generated, plan.uncachedSentences);
  await Promise.allSettled(generated.items.map(deps.saveGenerated));
  return mergeBatchResponse(plan, cached, generated);
}
```

- [x] **Step 4: Add strict route validation and sanitized errors**

The route accepts only the batch request schema, returns `400` for invalid limits/provider, maps quota errors to `429`, and maps other generation failures to the same sanitized `500` style as `/api/analyze`.

- [x] **Step 5: Update route registry and smoke validation**

Add `/api/analyze-batch` to both infra registries and assert an empty batch returns `400` without calling a provider.

- [x] **Step 6: Verify the server slice**

Run: `npm run check:analysis-batch && npm run check:routes && npm run typecheck`
Expected: all pass, with the deterministic test proving one generation call for all uncached sentences.

---

### Task 4: Reusable bilingual progress component

**Files:**
- Create: `src/features/lingubreak/components/AnalysisProgress.tsx`
- Modify: `src/app/(student)/page.tsx`
- Modify: `src/features/lingubreak/components/SentenceInput.tsx`
- Modify: `scripts/check-learner-ui.ts`

**Interfaces:**
- Produces: `<AnalysisProgress variant="single" | "batch" />`

- [x] **Step 1: Add failing static UI assertions**

```ts
assert.match(progress, /เตรียมประโยคของคุณ/);
assert.match(progress, /Preparing your sentence/);
assert.match(progress, /aria-current/);
assert.match(progress, /motion-reduce/);
assert.doesNotMatch(sentenceInput, /Loader2/);
```

- [x] **Step 2: Implement timed stage presentation**

Use one interval derived from elapsed time, clear it on unmount, map active stages to progress values below 100, render completed `Check` icons, an active `Sparkles` icon, muted waiting circles, and a separate polite screen-reader announcement for only the active bilingual step.

- [x] **Step 3: Replace the page spinner and button spinner**

```tsx
{loading && <AnalysisProgress variant="single" />}
```

The button loading label becomes `กำลังแกะประโยค… · Working on it` with a non-spinning sparkle.

- [x] **Step 4: Verify learner loading UI**

Run: `npm run check:learner-ui && npm run lint && npm run typecheck`
Expected: all pass.

---

### Task 5: Editable OCR batch UI and instant ready results

**Files:**
- Create: `src/features/lingubreak/hooks/useBatchAnalyze.ts`
- Create: `src/features/ocr/components/OcrBatchAnalysis.tsx`
- Modify: `src/features/ocr/components/OcrInputPanel.tsx`
- Modify: `src/features/lingubreak/components/SentenceInput.tsx`
- Modify: `src/features/lingubreak/hooks/useAnalyze.ts`
- Modify: `src/app/(student)/page.tsx`
- Modify: `scripts/check-learner-ui.ts`

**Interfaces:**
- Produces: `useBatchAnalyze().analyze(sentences, reviewedText)`
- Produces: `useAnalyze().showResult(result)`
- Consumes: `BatchAnalysisResponseSchema`, `estimateBatchText`, `<AnalysisProgress variant="batch" />`

- [x] **Step 1: Extend static UI checks for the new flow**

```ts
assert.match(ocrBatch, /ตรวจข้อความแล้ว/);
assert.match(ocrBatch, /Break down all sentences/);
assert.match(ocrBatch, /พร้อมแล้ว/);
assert.match(ocrBatch, /View breakdown/);
assert.doesNotMatch(ocrInput, /SentencePicker/);
```

- [x] **Step 2: Implement the batch request hook**

The hook posts once to `/api/analyze-batch`, validates the response with `BatchAnalysisResponseSchema`, preserves reviewed text on error, stores the exact analyzed-text fingerprint, and exposes reset state.

- [x] **Step 3: Implement the OCR batch card**

Render sentence count, approximate text tokens, Light/Medium/High level, the one-request label, limit errors, explicit batch button, batch progress, actual usage, ready panels, and an outdated warning when current reviewed text differs from the analyzed fingerprint.

- [x] **Step 4: Wire instant result display**

```ts
const showResult = useCallback((readyResult: AnalysisResult) => {
  setResult(readyResult);
  setError(null);
  setLoading(false);
}, []);
```

Propagate `(sentence, result)` from `OcrBatchAnalysis` through `OcrInputPanel` and `SentenceInput` to `Home`; set the input sentence and call `showResult` directly. Do not invoke either analysis fetch path.

- [x] **Step 5: Verify the complete learner contract**

Run: `npm run check:learner-ui && npm run check:analysis-batch && npm run lint && npm run typecheck`
Expected: all pass.

---

### Task 6: CI, handover documentation, and final verification

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-30-analysis-progress-ocr-batch.md`

**Interfaces:**
- CI runs `npm run check:analysis-batch` without live provider calls.
- README documents one-request OCR batch behavior, limits, usage estimate semantics, API contract, and ready-result selection.

- [x] **Step 1: Add the deterministic batch check to CI**

Place it beside the existing learner and content contract gates; do not add a live Gemini batch call.

- [x] **Step 2: Update README handover documentation**

Update the architecture/data flow, OCR learner flow, API table, validation commands, security notes, and limitations. Preserve the existing uncommitted README work and do not stage the user's untracked source specification.

- [x] **Step 3: Run required gates**

```bash
npm run check:env
npm run check:routes
npm run check:content-inputs
npm run check:dictionary
npm run check:learner-ui
npm run check:analysis-batch
npm run check:ocr
npm run check:mcp:ocr
npm run lint
npm run typecheck
npm run build
```

Expected: every deterministic command passes.

- [x] **Step 4: Run the production API smoke procedure**

Run `npm run start`, wait for `/api/dictionary` to return its expected validation status, then run `BASE_URL=http://127.0.0.1:3000 npm run smoke:api`.

Expected: the new empty batch request is sanitized `400`, cloud OCR remains gated `404`, and all existing smoke checks pass.

- [x] **Step 5: Audit and commit only intended files**

Run `git diff --check`, inspect status/stat/diff, ensure `CAFFEINE_OCR_PRODUCTION_MCP_CODEX.md` remains untracked, and commit with `IckeNount <ickenount.tgi@gmail.com>` and no co-author trailer.
