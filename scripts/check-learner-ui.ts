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

assert.match(wordLookup, /aria-pressed/);
assert.match(wordLookup, /aria-live="polite"/);
assert.match(card, /lang="th"/);
assert.match(page, /WordLookup/);
assert.doesNotMatch(page, /ModelSwitcher/);
assert.doesNotMatch(page, /ReconstructionView/);

console.log("check:learner-ui OK");
