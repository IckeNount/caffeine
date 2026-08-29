# Today's Reading Batch Analysis Design

**Date:** 2026-08-30

## Goal

Replace Today's Reading's old per-sentence analysis path with one explicit batch action that prepares every reading sentence in advance. Keep the manual English textarea and single-sentence **แกะประโยค · Break it down** action only in the default mode, when neither Today's Reading nor Scan is active.

## Existing sentence-boundary contract

Today's Reading already returns an intelligent, validated sentence array rather than splitting display text heuristically in the browser:

- The reading generator creates a 60–100 word paragraph in exactly 3 or 4 complete sentences.
- The structured response includes both `paragraph` and `sentences`.
- `DailyReadingAdaptationSchema` requires 3–4 sentence items, with each item between 1 and 500 characters.
- Schema refinement normalizes whitespace and verifies that `sentences.join(" ")` reproduces `paragraph` exactly.
- A response with missing, combined, reordered, or extra text is rejected before it reaches the learner UI.

Each ready panel therefore represents one complete sentence. The application will not dynamically combine sentence pairs or multi-sentence sequences because LinguBreak's chunking and four teaching steps are defined around one sentence. All reading sentences still travel together in one batch request, so request count does not increase.

## Learner flow

1. The learner opens **บทอ่านวันนี้ · Today**.
2. The existing reading request loads and displays the paragraph, attribution, and license details.
3. The UI shows the existing usage estimate for the 3–4 validated sentences.
4. Nothing is analyzed automatically.
5. The learner clicks **พร้อมเรียนแล้ว · Break down all sentences**.
6. `POST /api/analyze-batch` reuses cached sentence results and sends every uncached sentence through one Gemini generation request.
7. The bilingual progress checklist remains visible while the batch is running.
8. Ready sentence panels replace the old clickable raw-sentence list.
9. Selecting a ready panel displays its stored `AnalysisResult` immediately without calling `/api/analyze` or `/api/analyze-batch` again.
10. The Today panel stays open so the learner can switch between ready sentence results.

If batch analysis fails, the reading paragraph, attribution, and explicit batch action remain available. The learner can retry the whole batch; the UI never falls back to hidden per-sentence generation.

## Shared component architecture

Generalize the current OCR-specific batch UI into one shared LinguBreak component:

```ts
interface BatchSentenceAnalysisProps {
  variant: "ocr" | "reading";
  sentences: string[];
  sourceText: string;
  onReady: (sentence: string, result: AnalysisResult) => void;
  onLoadingChange?: (loading: boolean) => void;
}
```

The shared component owns:

- batch input validation and deduplication
- learner-text usage estimation
- the one-request `useBatchAnalyze` call
- bilingual progress, errors, provider usage, and ready panels
- analyzed-source fingerprinting so editable OCR results become outdated after text changes

Variant-specific copy is limited to the introductory text, confirmation button, and outdated-text message. OCR keeps **ตรวจข้อความแล้ว · Break down all sentences** and its editable-text warning. Today's Reading uses **พร้อมเรียนแล้ว · Break down all sentences**; its server-validated paragraph is not editable, so it does not need an outdated-text warning during normal use.

`OcrInputPanel` consumes the shared component with `variant="ocr"`. `DailyReadingPanel` removes `SentencePicker` and consumes it with `variant="reading"` using `reading.sentences` and `reading.paragraph`.

No API, schema, database, cache, RAG, or provider changes are required. Both sources reuse the existing strict `/api/analyze-batch` boundary.

## Source-mode controls

`SentenceInput` changes its manual-control condition from “not Scan” to default mode only:

```ts
const showManualAnalysis = activeSource === null;
```

Consequences:

- Default mode shows the manual textarea and single-sentence submit action for a sentence the learner wants to type or paste.
- Today's Reading hides the manual textarea and single-sentence submit action because its paragraph uses batch analysis.
- Scan continues hiding those controls because its editable extracted text uses batch analysis.
- Choosing an example exits the active source through the existing `chooseSentence` behavior and returns to manual mode with that example filled in.
- Reset exits either source, clears the selected analysis, and restores default manual mode.

Today's Reading and Scan share the same parent `batchLoading` state. While either batch runs, source switching and competing manual actions remain disabled.

## Accessibility

- Hidden manual controls are conditionally unmounted and cannot receive keyboard focus.
- The explicit Today batch action is a normal button with bilingual visible text.
- The existing `AnalysisProgress` live status, `aria-current` stages, reduced-motion behavior, and ready-result button semantics are reused.
- Reading attribution links remain available before and after analysis.

## Verification

- Extend `scripts/check-learner-ui.ts` to require `activeSource === null`, ensure Today's Reading no longer imports `SentencePicker`, and confirm it uses the shared batch component with `variant="reading"` and the approved bilingual action copy.
- Keep `scripts/check-content-inputs.ts` assertions proving that 3–4 sentences reproduce the paragraph exactly.
- Extend the deterministic batch check only if shared-component extraction changes a runtime contract; no live Gemini request is needed.
- Update the OCR browser specification import/markup assumptions if the component move affects them, but do not run browser automation unless explicitly requested.
- Run `npm run check:content-inputs`, `npm run check:learner-ui`, `npm run check:analysis-batch`, `npm run lint`, `npm run typecheck`, and `npm run build`.

## Documentation

Update the README product scope, component responsibilities, Today's Reading flow, analysis sequence, validation description, and maintenance map. Document that both Today and Scan use the same explicit one-request batch experience, while the manual textarea is reserved for default mode.

## Out of scope

- Automatic batch analysis when the paragraph loads.
- Dynamic sentence pairing or sequence grouping.
- Editing generated Today's Reading text.
- Changing reading generation, source selection, daily caching, batch limits, Gemini models, or provider fallback behavior.
- Adding a new endpoint or making live provider calls during deterministic tests.
