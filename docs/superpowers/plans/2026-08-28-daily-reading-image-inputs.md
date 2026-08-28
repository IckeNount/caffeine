# Daily Reading and Image Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a commercially reusable daily A2–B1 reading source and image/camera OCR sentence selection to the existing LinguBreak input.

**Architecture:** A public cached route fetches a date-selected, reviewed Simple English Wikipedia topic and adapts it through OpenRouter with a strict Zod schema. The client keeps one textarea as the destination and uses a shared sentence picker for both daily content and local OCR text.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, OpenAI SDK/OpenRouter, Zod 4, MediaWiki Action API, Tesseract.js, native file inputs.

## Global Constraints

- Target ages 10–13 and CEFR A2–B1.
- Daily readings contain 3–4 sentences and 60–100 words.
- Analyze one sentence at a time with the existing `/api/analyze` contract.
- `OPENROUTER_API_KEY` remains the only required LLM key for this flow.
- Publish adaptations under CC BY-SA 4.0 with source, change, and license notices.
- Accept only JPEG, PNG, WebP, camera photos, and screenshots up to 10 MB.
- Default OCR remains local Tesseract; do not call Gemini normally.
- Do not add databases, schedulers, PDF/Word parsing, camera libraries, fallback providers, retries, or unrelated refactors.

---

### Task 1: Deterministic content contracts

**Files:**
- Create: `src/features/daily-reading/lib/schema.ts`
- Create: `src/features/daily-reading/lib/source.ts`
- Create: `src/shared/lib/text/split-english-sentences.ts`
- Create: `scripts/check-content-inputs.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `DailyReadingAdaptationSchema`, `DailyReadingSchema`, `DailyReading`, `getTopicForDate(date)`, `fetchDailyReadingSource(date)`, and `splitEnglishSentences(text)`.
- Consumes: no application state or database.

- [x] **Step 1: Write the failing focused contract check**

Create `scripts/check-content-inputs.ts` using `node:assert/strict`. It must assert that a 3-sentence, 60-word adaptation parses; a two-sentence adaptation fails; the same UTC date always selects the same reviewed topic; and `splitEnglishSentences("One sentence. Is this two? Yes!")` returns three strings.

```ts
assert.equal(DailyReadingAdaptationSchema.safeParse(valid).success, true);
assert.equal(DailyReadingAdaptationSchema.safeParse({ ...valid, sentences: valid.sentences.slice(0, 2) }).success, false);
assert.equal(getTopicForDate(new Date("2026-08-28T00:00:00Z")), getTopicForDate(new Date("2026-08-28T23:59:59Z")));
assert.deepEqual(splitEnglishSentences("One sentence. Is this two? Yes!"), ["One sentence.", "Is this two?", "Yes!"]);
```

- [x] **Step 2: Run the check and verify it fails**

Run: `npx tsx scripts/check-content-inputs.ts`

Expected: module-not-found failure because the contracts do not exist.

- [x] **Step 3: Implement the schemas and sentence splitter**

`DailyReadingAdaptationSchema` requires a title, paragraph, and 3–4 sentences of at most 500 characters, checks 60–100 words, and verifies that normalized `sentences.join(" ")` equals the paragraph. `DailyReadingSchema` adds `generatedDate`, nested `source`, and `adaptationNotice`.

`splitEnglishSentences` uses `Intl.Segmenter("en", { granularity: "sentence" })` and falls back to `text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)`. It normalizes whitespace and keeps only strings 1–500 characters long.

- [x] **Step 4: Implement reviewed topic selection and MediaWiki acquisition**

Use a constant allowlist of safe Simple English Wikipedia titles. Select by the UTC day number modulo the allowlist length. Fetch `https://simple.wikipedia.org/w/api.php` with `action=query`, `prop=extracts|info`, `exintro=1`, `explaintext=1`, `inprop=url`, `format=json`, and `formatversion=2`; reject missing titles, URLs, or extracts shorter than 200 characters.

- [x] **Step 5: Register and run the focused check**

Add `"check:content-inputs": "tsx scripts/check-content-inputs.ts"` to `package.json`.

Run: `npm run check:content-inputs`

Expected: `check:content-inputs OK`.

### Task 2: OpenRouter adaptation and public daily route

**Files:**
- Create: `src/features/daily-reading/lib/generate.ts`
- Create: `src/app/api/daily-reading/route.ts`
- Modify: `infra/gateway-routes.yaml`
- Modify: `infra/ROUTES.md`
- Modify: `scripts/smoke-api.ts`

**Interfaces:**
- Consumes: `fetchDailyReadingSource`, `DailyReadingAdaptationSchema`, `DailyReadingSchema`, `OPENROUTER_ANALYSIS_MODEL`.
- Produces: `generateDailyReading(date?: Date): Promise<DailyReading>` and public `GET /api/daily-reading`.

- [x] **Step 1: Implement strict learner adaptation**

Use the existing OpenAI SDK against `https://openrouter.ai/api/v1`. Request `openrouter/free` with `zodResponseFormat(DailyReadingAdaptationSchema, "daily_reading")`, `provider: { require_parameters: true }`, temperature `0.2`, and `max_tokens: 1200`. The prompt forbids facts outside the supplied extract and requires neutral, safe, 60–100 word A2–B1 output.

- [x] **Step 2: Attach server-owned provenance**

Return a `DailyReadingSchema`-validated object with date `YYYY-MM-DD`, canonical source URL/title, `CC BY-SA 4.0`, `https://creativecommons.org/licenses/by-sa/4.0/`, and the notice `Adapted and simplified from Simple English Wikipedia; changes were made.`

- [x] **Step 3: Add the route boundary**

`GET` returns JSON with `Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600`. Any acquisition, provider, or validation failure logs server-side and returns `{ "error": "Today's reading is temporarily unavailable. Please try again." }` with status 503.

- [x] **Step 4: Register and smoke-check the route**

Add `/api/daily-reading` with `auth: none` to `infra/gateway-routes.yaml`, document it in `infra/ROUTES.md`, and add a smoke expectation that GET returns either 200 or the defined 503 without accepting user parameters.

Run: `npm run check:routes`

Expected: three API route prefixes are registered: analyze, OCR, and daily reading.

### Task 3: Shared sentence picker and daily panel

**Files:**
- Create: `src/features/lingubreak/components/SentencePicker.tsx`
- Create: `src/features/daily-reading/components/DailyReadingPanel.tsx`
- Create: `src/features/daily-reading/index.ts`

**Interfaces:**
- Consumes: `GET /api/daily-reading` and `DailyReadingSchema`.
- Produces: `SentencePicker({ sentences, onSelect })` and `DailyReadingPanel({ open, onSelect })`.

- [x] **Step 1: Build the sentence picker**

Render each sentence as a numbered `type="button"` control. Disable none of the validated sentences; call `onSelect(sentence)` without submitting the surrounding form.

- [x] **Step 2: Build the daily panel state machine**

When opened, fetch once with an `AbortController`, validate JSON with `DailyReadingSchema`, and render loading, retryable error, paragraph, sentence picker, source link, adaptation notice, and CC BY-SA license link. Do not auto-analyze the selected sentence.

- [x] **Step 3: Export the panel**

Export `DailyReadingPanel`, schemas, and types from `src/features/daily-reading/index.ts`; do not export server-only acquisition or generation functions through the client barrel.

### Task 4: Native upload/camera OCR panel

**Files:**
- Modify: `src/features/ocr/components/ImageUploader.tsx`
- Create: `src/features/ocr/components/OcrInputPanel.tsx`
- Modify: `src/features/ocr/index.ts`

**Interfaces:**
- Consumes: existing `useOcr("tesseract")`, `ImageUploader`, `splitEnglishSentences`, and `SentencePicker`.
- Produces: `OcrInputPanel({ open, onSelect })`.

- [x] **Step 1: Add the native camera input**

Keep the existing device input and add a second hidden input:

```tsx
<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
```

Expose separate “Choose image” and “Take photo” buttons, pass both through the same MIME/size validation, and clear both input values on reset.

- [x] **Step 2: Build the OCR panel**

Run local Tesseract after selection, show its progress/error, copy result text into an editable textarea, split edited text deterministically, and render sentence choices. If none qualify, retain the textarea and explain that the learner can correct the text or try a clearer image.

- [x] **Step 3: Export the panel**

Add `OcrInputPanel` to `src/features/ocr/index.ts`. Keep the Gemini route and existing OCR adapters unchanged.

### Task 5: Integrate the two input sources

**Files:**
- Modify: `src/features/lingubreak/components/SentenceInput.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `DailyReadingPanel` and `OcrInputPanel`.
- Produces: the existing `SentenceInputProps` contract unchanged.

- [x] **Step 1: Add two source controls**

Add “Today’s Reading” and “Scan Text” buttons above the textarea. Track `activeSource: "daily" | "scan" | null`; opening one closes the other.

- [x] **Step 2: Connect sentence selection**

Both panels call one handler that sets the textarea value and closes the active panel. Manual typing, examples, reset, and the existing submit flow remain unchanged.

- [x] **Step 3: Document the feature and focused check**

Document Simple English Wikipedia attribution/share-alike behavior, local image OCR, native camera capture, and `npm run check:content-inputs` in the README.

### Task 6: Verification and commits

**Files:**
- Modify: `scripts/check-content-inputs.ts` only if static assertions reveal a real contract gap.

- [x] **Step 1: Add static camera and route assertions**

Read `ImageUploader.tsx` and assert it contains `capture="environment"`; read `gateway-routes.yaml` and assert `/api/daily-reading` is registered. Run `npm run check:content-inputs` and expect success.

- [x] **Step 2: Run project contracts**

Run: `npm run check:env && npm run check:routes && npm run typecheck && npm run lint`

Expected: all commands exit 0.

- [x] **Step 3: Run production build**

Run: `npm run build`

Expected: compilation succeeds and `/api/daily-reading` appears without any `/api/health` route.

- [x] **Step 4: Run focused live checks**

Start the production server and run `npm run smoke:api`. Fetch `/api/daily-reading`; expect either a validated 200 response or the sanitized 503 when the free router is temporarily unable to produce valid structured output.

- [x] **Step 5: Commit implementation**

Stage only the files named by this plan and commit with `feat: add learner content inputs`. Leave `CAFFEINE_DEMO_CORE_REFACTOR_CODEX.md` untouched.
