# Hide Manual Analysis Input During OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the general sentence textarea and single-sentence submit action while the Scan/OCR panel supplies pre-analyzed ready sentences.

**Architecture:** Keep `SentenceInput` as the source-mode owner and derive one `showManualAnalysis` boolean from `activeSource`. Conditionally unmount only the redundant manual input and submit control while preserving OCR state, ready-result selection, examples, Reset, and every non-Scan flow.

**Tech Stack:** React 19, TypeScript, Next.js 16, Tailwind CSS, `tsx` static contract checks, Playwright specification.

## Global Constraints

- Apply the change only while `activeSource === "scan"`.
- Do not change OCR extraction, batch analysis, caching, Gemini requests, usage reporting, or result rendering.
- Typed, example, and Today's Reading behavior must remain unchanged outside Scan.
- Selecting a ready OCR result must still use local state without another API call.
- Keep Reset visible after a result exists.
- Do not run browser automation because it was not explicitly requested.
- Do not stage `CAFFEINE_OCR_PRODUCTION_MCP_CODEX.md`.

---

### Task 1: Remove redundant manual controls from Scan mode

**Files:**
- Modify: `scripts/check-learner-ui.ts`
- Modify: `src/features/lingubreak/components/SentenceInput.tsx`
- Modify: `tests/e2e/ocr.spec.ts`
- Modify: `docs/superpowers/plans/2026-08-30-hide-manual-input-during-ocr.md`

**Interfaces:**
- Consumes: `activeSource: "daily" | "scan" | null`, `hasResult: boolean`
- Produces: `showManualAnalysis: boolean`, where Scan maps to `false` and all other source states map to `true`

- [x] **Step 1: Add failing static contract assertions**

Add these checks to `scripts/check-learner-ui.ts`:

```ts
assert.match(
  sentenceInput,
  /const showManualAnalysis = activeSource !== "scan"/,
);
assert.match(sentenceInput, /showManualAnalysis && \(\s*<div data-manual-analysis-input/);
assert.match(sentenceInput, /showManualAnalysis && \(\s*<button\s+[\s\S]*?data-manual-analysis-submit/);
```

- [x] **Step 2: Run the focused check and verify it fails**

Run: `npm run check:learner-ui`

Expected: FAIL because `showManualAnalysis` and both guarded control markers do not exist yet.

- [x] **Step 3: Implement the source-mode render guard**

In `SentenceInput`, derive the render state beside `busy`:

```tsx
const showManualAnalysis = activeSource !== "scan";
```

Wrap the existing textarea block without changing its contents:

```tsx
{showManualAnalysis && (
  <div data-manual-analysis-input>
    <label htmlFor="sentence-input" className="eyebrow">
      ประโยคภาษาอังกฤษ · English sentence
    </label>
    <div className="relative mt-2">
      <textarea
        id="sentence-input"
        value={sentence}
        onChange={(event) => setSentence(event.target.value)}
        placeholder="Type or paste one English sentence…"
        className="learner-input min-h-[128px] resize-y p-4 pb-9 text-lg leading-relaxed"
        maxLength={500}
        disabled={busy}
      />
      <span className="absolute bottom-3 right-4 text-xs tabular-nums text-[var(--text-secondary)]">
        {sentence.length}/500
      </span>
    </div>
  </div>
)}
```

Render the footer only when it has a visible action, and guard the existing submit button separately from Reset:

```tsx
{(showManualAnalysis || hasResult) && (
  <div className="flex flex-col gap-3 sm:flex-row">
    {showManualAnalysis && (
      <button
        type="submit"
        data-manual-analysis-submit
        disabled={!sentence.trim() || busy}
        className="learner-button learner-button-primary flex-1 px-6 py-3.5 text-base"
      >
        {loading ? (
          <><WandSparkles className="h-5 w-5 motion-safe:animate-pulse" aria-hidden="true" />กำลังแกะประโยค… · Working on it</>
        ) : (
          <><WandSparkles className="h-5 w-5" aria-hidden="true" />แกะประโยค · Break it down</>
        )}
      </button>
    )}
    {hasResult && (
      <button
        type="button"
        onClick={handleReset}
        className="learner-button learner-button-quiet px-5"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />เริ่มใหม่ · Reset
      </button>
    )}
  </div>
)}
```

Keep the example selector outside these guards so choosing an example still exits Scan through `chooseSentence`.

- [x] **Step 4: Align the OCR browser specification**

Replace the obsolete assertion that expects the hidden textarea to receive the ready sentence:

```ts
await expect(page.locator("#sentence-input")).toHaveCount(0);
await expect(page.getByText("คำแปลทดสอบ")).toBeVisible();
```

Keep the existing assertions that exactly one batch request occurred and no single-sentence or cloud OCR request occurred. Do not execute Playwright in this task.

- [x] **Step 5: Run non-browser verification**

Run:

```bash
npm run check:learner-ui
npm run lint
npm run typecheck
git diff --check
```

Expected: every command passes.

- [x] **Step 6: Audit and commit the intended files**

Confirm `CAFFEINE_OCR_PRODUCTION_MCP_CODEX.md` remains untracked, then commit only the plan, component, static check, and aligned browser specification:

```bash
git add docs/superpowers/plans/2026-08-30-hide-manual-input-during-ocr.md scripts/check-learner-ui.ts src/features/lingubreak/components/SentenceInput.tsx tests/e2e/ocr.spec.ts
git -c user.name='IckeNount' -c user.email='ickenount.tgi@gmail.com' commit -m 'fix: remove redundant OCR analysis controls'
```

Expected: one commit authored by `IckeNount <ickenount.tgi@gmail.com>` with no co-author trailer.
