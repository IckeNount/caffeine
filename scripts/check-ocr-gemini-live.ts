import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

async function main() {
  if (process.env.OCR_LIVE_GEMINI !== "1") {
    console.log("check:ocr:gemini-live SKIPPED (set OCR_LIVE_GEMINI=1 to run)");
    return;
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error("GEMINI_API_KEY is required when OCR_LIVE_GEMINI=1");
  }

  const { extractText } = await import("../src/shared/lib/ocr/ocr-service");
  const fixture = await readFile(
    path.join(process.cwd(), "tests/fixtures/ocr/clean-english.png"),
  );
  const result = await extractText(fixture, "image/png", { mode: "text" });
  assert.match(result.text, /Caffeine helps learners read English/i);
  assert.equal(result.provider, "gemini");
  console.log("check:ocr:gemini-live OK");
}

void main();
