# Hide Manual Analysis Input During OCR Design

**Date:** 2026-08-30

## Goal

Remove the redundant manual sentence textarea and **แกะประโยค · Break it down** action while the learner is using the Scan/OCR flow. Reviewed OCR sentences are already analyzed together and selected from ready-result panels, so a second manual submission path is unnecessary and confusing.

## Approved scope

- Apply the change only while `activeSource === "scan"` in `SentenceInput`.
- Keep the editable extracted-text review, usage estimate, batch confirmation button, progress checklist, and ready-result panels unchanged.
- Keep typed sentence analysis, example selection, and Today's Reading behavior unchanged when Scan is not active.
- Preserve the current behavior where selecting a ready OCR sentence displays its stored analysis without another API request and keeps the Scan panel available for switching sentences.
- Keep **เริ่มใหม่ · Reset** available after a result exists so the learner can leave the completed flow deliberately.

## UI behavior

When Scan is active:

1. The OCR panel is the only sentence-review and analysis control.
2. The general `#sentence-input` textarea is not rendered.
3. The general **แกะประโยค · Break it down** submit button is not rendered.
4. The example selector remains available as an intentional way to leave Scan and choose an example.
5. If an OCR result is selected, the Reset action remains visible by itself.

When Scan is closed, the general textarea and submit button return with their existing content and behavior. Conditional rendering preserves any manual sentence text already held in component state.

## Accessibility and state

- Removed controls are conditionally unmounted, so hidden inputs cannot receive keyboard focus.
- Batch loading still disables source switching and other competing actions.
- Selecting a ready OCR result continues to update the shared result view locally; it must not call `/api/analyze` or `/api/analyze-batch` again.

## Verification

- Extend `scripts/check-learner-ui.ts` to assert that the general textarea and submit area are guarded by the non-Scan condition.
- Run `npm run check:learner-ui`, `npm run lint`, and `npm run typecheck`.
- Browser automation is not required because it was not explicitly requested.

## Out of scope

- Removing manual analysis from the entire application.
- Changing OCR extraction, batch limits, caching, Gemini orchestration, usage reporting, or result rendering.
- Redesigning Today's Reading or example selection.
