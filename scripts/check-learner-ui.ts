import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const wordLookup = read(
  "src/features/dictionary/components/WordLookup.tsx",
);
const card = read("src/features/dictionary/components/DictionaryCard.tsx");
const page = read("src/app/(student)/page.tsx");
const steps = read(
  "src/features/lingubreak/components/StepAccordion.tsx",
);
const progress = read(
  "src/features/lingubreak/components/AnalysisProgress.tsx",
);
const sentenceInput = read(
  "src/features/lingubreak/components/SentenceInput.tsx",
);
const ocrInput = read("src/features/ocr/components/OcrInputPanel.tsx");
const ocrBatch = read("src/features/ocr/components/OcrBatchAnalysis.tsx");

assert.match(wordLookup, /aria-pressed/);
assert.match(wordLookup, /aria-live="polite"/);
assert.match(card, /lang="th"/);
assert.match(page, /WordLookup/);
assert.match(page, /TranslationHero/);
assert.match(page, /OrderComparison/);
assert.doesNotMatch(page, /ModelSwitcher/);
assert.doesNotMatch(page, /ReconstructionView/);
assert.doesNotMatch(page, /ComparisonView/);
assert.match(steps, /aria-controls/);
assert.match(steps, /step\.title_thai[\s\S]*step\.title/);
assert.match(steps, /step\.description_thai[\s\S]*step\.description/);
assert.doesNotMatch(steps, /truncate/);
assert.match(progress, /เตรียมประโยคของคุณ/);
assert.match(progress, /Preparing your sentence/);
assert.match(progress, /aria-current/);
assert.match(progress, /motion-reduce/);
assert.doesNotMatch(sentenceInput, /Loader2/);
assert.match(
  sentenceInput,
  /const showManualAnalysis = activeSource !== "scan"/,
);
assert.match(
  sentenceInput,
  /showManualAnalysis && \(\s*<div data-manual-analysis-input/,
);
assert.match(
  sentenceInput,
  /showManualAnalysis && \(\s*<button\s+[\s\S]*?data-manual-analysis-submit/,
);
assert.match(ocrBatch, /ตรวจข้อความแล้ว/);
assert.match(ocrBatch, /Break down all sentences/);
assert.match(ocrBatch, /พร้อมแล้ว/);
assert.match(ocrBatch, /View breakdown/);
assert.doesNotMatch(ocrInput, /SentencePicker/);
assert.match(ocrInput, /onReadyAnalysis/);

console.log("check:learner-ui OK");
