import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DailyReadingAdaptationSchema } from "../src/features/daily-reading/lib/schema";
import { getTopicForDate } from "../src/features/daily-reading/lib/source";
import { splitEnglishSentences } from "../src/shared/lib/text/split-english-sentences";

const sentences = [
  Array.from({ length: 20 }, (_, index) => `word${index + 1}`).join(" ") + ".",
  Array.from({ length: 20 }, (_, index) => `word${index + 21}`).join(" ") + ".",
  Array.from({ length: 20 }, (_, index) => `word${index + 41}`).join(" ") + ".",
];
const valid = {
  title: "A safe learner reading",
  paragraph: sentences.join(" "),
  sentences,
};

assert.equal(DailyReadingAdaptationSchema.safeParse(valid).success, true);
assert.equal(
  DailyReadingAdaptationSchema.safeParse({
    ...valid,
    paragraph: sentences.slice(0, 2).join(" "),
    sentences: sentences.slice(0, 2),
  }).success,
  false,
);
assert.equal(
  getTopicForDate(new Date("2026-08-28T00:00:00Z")),
  getTopicForDate(new Date("2026-08-28T23:59:59Z")),
);
assert.deepEqual(splitEnglishSentences("One sentence. Is this two? Yes!"), [
  "One sentence.",
  "Is this two?",
  "Yes!",
]);

const uploaderPath = join(
  process.cwd(),
  "src/features/ocr/components/ImageUploader.tsx",
);
const gatewayPath = join(process.cwd(), "infra/gateway-routes.yaml");
const uploader = readFileSync(uploaderPath, "utf8");
const gateway = readFileSync(gatewayPath, "utf8");

assert.match(uploader, /capture=["{]environment/);
assert.match(gateway, /path:\s+\/api\/daily-reading/);

console.log("check:content-inputs OK");
