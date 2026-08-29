# Bilingual Sentence-Analysis Progress Design

## Goal

Replace the current sentence-analysis spinner with a reassuring progress card that tells Thai learners, in plain bilingual language, what the application is working on while they wait.

## Scope

This change covers only the learner-side loading presentation for `POST /api/analyze`. It does not change the API contract, analysis pipeline, result UI, provider behavior, or request latency.

## Design principles

- Use Thai and English together, with Thai visually primary.
- Describe learner outcomes rather than implementation details such as embeddings, retrieval, schemas, or model calls.
- Do not claim that the browser receives real backend stage telemetry. The displayed stages are paced waiting guidance.
- Never delay a fast result merely to finish the animation.
- Never show 100% completion before a result arrives.
- Match Caffeine's existing warm, supportive learner-card visual language.

## Learner experience

Submitting **แกะประโยค · Break it down** disables the existing inputs and replaces the simple page-level loading message with a progress card.

The card contains a slim gold progress track and four vertically stacked stages:

1. **เตรียมประโยคของคุณ · Preparing your sentence**
2. **หาหัวใจหลักของประโยค · Finding the heart of the sentence**
3. **แบ่งประโยคให้อ่านง่าย · Breaking it into easy parts**
4. **จัดคำอธิบายให้เข้าใจง่ายสำหรับคนไทย · Preparing your Thai-friendly guide**

Each row has one of three states:

- completed: filled checkmark and normal text;
- active: highlighted row with a gentle pulse and stronger text;
- waiting: muted circle and text.

The progress card advances through approximate waiting milestones and caps below 100%. When the response arrives, the result replaces the progress card immediately. If the request fails, the progress card disappears and the existing bilingual error card remains the source of truth.

The submit button uses a static or gently pulsing sparkle with **กำลังแกะประโยค… · Working on it** instead of the current spinning loader. The detailed progress remains in the page-level card so the button does not duplicate it.

## Component design

Create `src/features/lingubreak/components/AnalysisProgress.tsx` as a focused client component.

The component owns only presentation timing:

- stage 1 is active immediately;
- stage 2 becomes active after roughly 1.2 seconds;
- stage 3 becomes active after roughly 3 seconds;
- stage 4 becomes active after roughly 6 seconds;
- progress advances with the active stage and remains below 100% while mounted.

The component exposes no backend concepts and requires no changes to `useAnalyze`. Mounting and unmounting remain controlled by the existing `loading` boolean in `src/app/(student)/page.tsx`.

## Accessibility and motion

- The card uses `role="status"` and polite live-region behavior.
- Only the newly active description is announced; decorative icons are hidden from assistive technology.
- The active row uses `aria-current="step"`.
- Meaning is conveyed through icons and text, not color alone.
- Motion is limited to subtle opacity/width transitions and respects reduced-motion preferences through Tailwind motion utilities.

## Error and lifecycle behavior

- Timers are cleared when the component unmounts.
- A new request starts again at stage 1.
- Resetting or receiving an error removes the progress card through the existing `loading=false` lifecycle.
- A fast cache hit renders results immediately without imposing a minimum loading duration.
- The UI never claims that an individual backend operation definitely completed; it presents approximate, learner-friendly waiting milestones.

## Verification

- Extend the lightweight learner UI contract check to confirm the bilingual progress copy, progress semantics, and absence of the old spinning analysis loader.
- Run `npm run check:learner-ui`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- Browser automation is not required unless explicitly requested; repository instructions prefer static and build verification for ordinary UI changes.

## Non-goals

- Streaming progress from the server.
- Changing the analysis API or adding polling.
- Showing technical backend stages or fabricated percentages.
- Delaying results so every stage can complete.
- Changing OCR, daily reading, dictionary, RAG, or analysis-result presentation.
