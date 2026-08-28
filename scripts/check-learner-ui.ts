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

console.log("check:learner-ui OK");
