# Bilingual Analysis Progress and OCR Batch Design

## Goal

Replace the current sentence-analysis spinner with a reassuring bilingual progress card and remove the OCR workflow's one-request-per-sentence bottleneck. After reviewing extracted text, a learner can analyze up to ten sentences in one batch and switch among ready breakdowns without additional model calls.

## Scope

This change covers:

- learner-friendly progress for normal single-sentence analysis;
- an editable OCR review step followed by one deliberate batch-analysis action;
- one Gemini generation request containing every uncached sentence in that batch;
- cache reuse, usage estimates, actual token reporting, and instant selection of completed breakdowns.

It does not change the structure of an individual `AnalysisResult`, automatically analyze OCR output, expose provider credentials, or claim access to Gemini's remaining project balance.

## Design principles

- Use Thai and English together, with Thai visually primary.
- Describe learner outcomes rather than embeddings, retrieval, schemas, or model calls in progress copy.
- Do not claim that the browser receives real backend stage telemetry. Progress stages are paced waiting guidance.
- Never delay a fast result merely to finish an animation.
- Never show 100% completion before a result arrives.
- Preserve the learner's opportunity to remove unwanted OCR text before spending AI usage.
- Reuse cached breakdowns and avoid duplicate work.
- Match Caffeine's existing warm, supportive learner-card visual language.

## Single-sentence progress

Submitting **แกะประโยค · Break it down** disables the existing inputs and replaces the simple page-level loading message with a progress card.

The singular stages are:

1. **เตรียมประโยคของคุณ · Preparing your sentence**
2. **หาหัวใจหลักของประโยค · Finding the heart of the sentence**
3. **แบ่งประโยคให้อ่านง่าย · Breaking it into easy parts**
4. **จัดคำอธิบายให้เข้าใจง่ายสำหรับคนไทย · Preparing your Thai-friendly guide**

The submit button uses a static or gently pulsing sparkle with **กำลังแกะประโยค… · Working on it** instead of the spinning loader. The detailed progress remains in the page-level card.

## OCR batch learner flow

The OCR path becomes:

```text
upload or capture image
  -> local OCR
  -> edit and remove unwanted extracted text
  -> validate 1-10 distinct sentences
  -> show estimated batch usage
  -> learner clicks ตรวจข้อความแล้ว · Break down all sentences
  -> one batch request
  -> ready sentence panels
  -> selecting a panel displays its cached in-memory AnalysisResult immediately
```

The existing extracted-text review box remains editable. The current pre-analysis `SentencePicker` is replaced in the OCR panel by a batch summary and action.

Before submission, the summary shows plain-language guidance such as:

```text
Estimated AI use: Medium
7 of 10 sentences · about 210 text tokens · 1 batch request
```

The estimate uses sentence count plus an approximate four-characters-per-token calculation for learner text. It is explicitly an estimate of submitted text size, not total billed tokens or Gemini credits remaining. Google exposes token counting and per-response usage, but not a reliable live remaining-credit balance for this application.

Batch limits are enforced on both client and server:

- at least 1 and at most 10 distinct sentences;
- at most 500 characters per sentence;
- at most 5,000 sentence characters in total;
- invalid or excessive input is rejected before provider work.

If the learner changes reviewed text after a successful batch, the ready results become visibly outdated and cannot be selected. No automatic request occurs. The learner can deliberately analyze the updated text again.

## Ready breakdowns

After a successful batch, each sentence appears as a completed panel with:

- the original sentence;
- **พร้อมแล้ว · Ready**;
- **ดูคำอธิบาย · View breakdown**.

Selecting a ready panel updates the main sentence input and displays its existing `AnalysisResult` immediately. It does not call `/api/analyze` or Gemini. The scan panel may collapse so the main breakdown is visible; reopening it preserves the batch results until the OCR panel is cleared or its text changes.

The panel also shows actual provider usage for the batch generation when Gemini returns it. Fully cached batches show that no new generation was required.

## Batch API contract

Add `POST /api/analyze-batch` with a strict runtime contract.

Request:

```ts
interface BatchAnalysisRequest {
  sentences: string[];
  provider?: "gemini";
}
```

Response:

```ts
interface BatchAnalysisResponse {
  items: Array<{
    sentence: string;
    result: AnalysisResult;
    source: "cache" | "generated";
  }>;
  usage: {
    generatedSentences: number;
    cachedSentences: number;
    promptTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
}
```

The route returns items in the learner's input order and uses the existing sanitized `400`, `429`, and `500` error style. One malformed or incomplete provider response fails the generated portion as a batch; it never falls back to hidden per-sentence Gemini calls.

## Batch orchestration

The server performs these steps:

1. Validate, normalize, and de-duplicate sentences while preserving order.
2. Compute the existing sentence hashes and load all matching Gemini cache rows in one Supabase query.
3. If every sentence is cached, return immediately with zero generated sentences.
4. For uncached sentences, create embeddings in one OpenRouter batch embedding request.
5. Retrieve bounded knowledge-base and approved-example context per embedding. If batch embedding fails, all uncached sentences use the existing prompt-only behavior; an individual database retrieval failure degrades only that sentence.
6. Send every uncached sentence and its bounded context in one schema-constrained Gemini generation request.
7. Validate that every requested sentence identifier has exactly one complete `AnalysisResult`.
8. Merge cached and generated items in input order.
9. Best-effort cache each newly generated result with its own provenance and retrieval trace.
10. Return Gemini `usageMetadata` token counts when present.

This preserves the quality and cache semantics of the existing single-sentence path while reducing repeated system-prompt overhead and generation request count.

## Components and state

Create `src/features/lingubreak/components/AnalysisProgress.tsx` as a focused client component with `variant: "single" | "batch"`.

The component owns presentation timing only:

- stage 1 is active immediately;
- stage 2 becomes active after roughly 1.2 seconds;
- stage 3 becomes active after roughly 3 seconds;
- stage 4 becomes active after roughly 6 seconds;
- the progress track remains below 100% while mounted.

Batch wording uses plural Thai and English descriptions, for example preparing the reviewed sentences, finding each sentence's main idea, breaking them into easy parts, and preparing the Thai-friendly guides.

Add a focused batch hook or state module for request, result, error, and usage state. Extend the existing result-state boundary with an explicit method for displaying a ready `AnalysisResult`; do not fake a completed request or call the single-analysis endpoint when a ready panel is selected.

## Accessibility and motion

- Progress cards use `role="status"` and polite live-region behavior.
- Only the newly active description is announced; decorative icons are hidden.
- The active row uses `aria-current="step"`.
- Completed, active, waiting, outdated, and ready states use icons and text, not color alone.
- Motion is limited to subtle opacity/width transitions and respects reduced-motion preferences.
- Batch validation and stale-result notices are actionable and associated with the review area.

## Error and lifecycle behavior

- Progress timers are cleared on unmount.
- New requests start at stage 1.
- Resetting or receiving an error removes the relevant progress card.
- Fast cache hits render immediately without a minimum loading duration.
- Batch errors preserve the learner's reviewed text for correction or retry.
- A batch retry remains one deliberate batch request; there is no automatic per-sentence retry.
- The UI presents approximate waiting milestones without claiming individual backend operations definitely completed.

## Verification

- Extend `check:learner-ui` for bilingual singular/batch progress copy, ready-panel semantics, and removal of the spinning analysis loader.
- Add a focused deterministic batch contract check covering limits, de-duplication, ordering, partial cache reuse, all-cache behavior, provider-result completeness, and the assertion that uncached items invoke the Gemini batch adapter exactly once.
- Confirm ready-panel selection sets an existing result without calling either analysis endpoint.
- Update route registry, environment-independent CI gates, API smoke expectations, and README handover documentation.
- Run `check:env`, `check:routes`, `check:content-inputs`, `check:learner-ui`, the new batch check, lint, typecheck, build, and production API smoke.
- Browser automation is not required unless explicitly requested; repository instructions prefer static and build verification for ordinary UI changes.

## Non-goals

- Streaming real progress from the server.
- Polling or background analysis jobs.
- Displaying fabricated percentages or Gemini credits remaining.
- Automatically analyzing text immediately after OCR.
- Sending one hidden Gemini generation per sentence.
- Analyzing more than ten sentences in one batch.
- Changing OCR extraction, daily reading, dictionary, or the shape of an individual `AnalysisResult`.
