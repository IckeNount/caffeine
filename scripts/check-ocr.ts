import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST as postCloudOcr } from "../src/app/api/ocr/route";
import {
  CloudOcrRequestOptionsSchema,
  MAX_IMAGE_SIZE,
  OcrError,
  OcrModeSchema,
  OcrResultSchema,
  validateImageBytes,
} from "../src/shared/lib/ocr";
import { isCloudOcrEnabled } from "../src/shared/lib/ocr/ocr-service";
import { extractTextWithTesseractNode } from "../src/shared/lib/ocr/tesseract-node";
import { resolveAllowedImagePath } from "../src/mcp/ocr-tool";

function expectOcrError(fn: () => unknown, code: OcrError["code"]): void {
  assert.throws(fn, (error) => error instanceof OcrError && error.code === code);
}

async function main() {
  assert.equal(OcrModeSchema.parse("text"), "text");
  assert.equal(OcrModeSchema.parse("smart"), "smart");
  assert.equal(OcrModeSchema.safeParse("banana").success, false);
  assert.equal(
    CloudOcrRequestOptionsSchema.safeParse({ mode: "smart", cloudConsent: false })
      .success,
    false,
  );

  const validResult = {
    text: "Readable English text.",
    paragraphs: ["Readable English text."],
    confidence: 0.9,
    detectedLanguage: "en",
    processingTimeMs: 25,
    provider: "tesseract" as const,
  };
  assert.equal(OcrResultSchema.safeParse(validResult).success, true);
  assert.equal(
    OcrResultSchema.safeParse({ ...validResult, confidence: 1.1 }).success,
    false,
  );
  assert.equal(
    OcrResultSchema.safeParse({ ...validResult, text: "", paragraphs: [] }).success,
    false,
  );

  const fixtureRoot = path.join(process.cwd(), "tests/fixtures/ocr");
  const fixturePath = path.join(fixtureRoot, "clean-english.png");
  const fixture = await readFile(fixturePath);
  const validated = validateImageBytes(fixture, "image/png");
  assert.equal(validated.mimeType, "image/png");
  assert.equal(validated.width, 1_000);
  assert.equal(validated.height, 260);

  const jpegFixture = await readFile(
    path.join(fixtureRoot, "clean-english.jpg"),
  );
  const validatedJpeg = validateImageBytes(jpegFixture, "image/jpeg");
  assert.equal(validatedJpeg.width, 1_000);
  assert.equal(validatedJpeg.height, 260);

  const tinyWebpHeader = new Uint8Array([
    82, 73, 70, 70, 22, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 88, 10, 0,
    0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0,
  ]);
  const validatedWebp = validateImageBytes(tinyWebpHeader, "image/webp");
  assert.equal(validatedWebp.width, 2);
  assert.equal(validatedWebp.height, 2);

  expectOcrError(() => validateImageBytes(fixture, "image/jpeg"), "INVALID_IMAGE");
  expectOcrError(
    () => validateImageBytes(new Uint8Array(), "image/png"),
    "INVALID_IMAGE",
  );
  expectOcrError(
    () => validateImageBytes(new Uint8Array(MAX_IMAGE_SIZE + 1), "image/png"),
    "IMAGE_TOO_LARGE",
  );
  expectOcrError(
    () => validateImageBytes(new TextEncoder().encode("not an image"), "image/png"),
    "INVALID_IMAGE",
  );
  expectOcrError(
    () =>
      validateImageBytes(
        new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99]),
        "image/heic",
      ),
    "UNSUPPORTED_FORMAT",
  );

  const hugePng = Buffer.from(fixture);
  hugePng.writeUInt32BE(12_001, 16);
  expectOcrError(() => validateImageBytes(hugePng, "image/png"), "INVALID_IMAGE");

  assert.equal(isCloudOcrEnabled({ OCR_CLOUD_ENABLED: "true" }), true);
  assert.equal(isCloudOcrEnabled({ OCR_CLOUD_ENABLED: "false" }), false);
  assert.equal(isCloudOcrEnabled({}), false);

  const createCloudRequest = (mode: string, cloudConsent: boolean) => {
    const form = new FormData();
    form.append(
      "image",
      new Blob([new Uint8Array(fixture)], { type: "image/png" }),
      "clean-english.png",
    );
    form.append("mode", mode);
    form.append("cloudConsent", String(cloudConsent));
    return new NextRequest("http://localhost/api/ocr", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: form,
    });
  };

  const previousCloudFlag = process.env.OCR_CLOUD_ENABLED;
  try {
    process.env.OCR_CLOUD_ENABLED = "false";
    const disabledResponse = await postCloudOcr(createCloudRequest("smart", true));
    assert.equal(disabledResponse.status, 404);

    process.env.OCR_CLOUD_ENABLED = "true";
    const invalidModeResponse = await postCloudOcr(
      createCloudRequest("banana", true),
    );
    assert.equal(invalidModeResponse.status, 400);
    assert.equal((await invalidModeResponse.json()).code, "INVALID_MODE");
  } finally {
    if (previousCloudFlag === undefined) delete process.env.OCR_CLOUD_ENABLED;
    else process.env.OCR_CLOUD_ENABLED = previousCloudFlag;
  }

  assert.equal(await resolveAllowedImagePath(fixturePath, fixtureRoot), fixturePath);
  await assert.rejects(
    resolveAllowedImagePath("../../../package.json", fixtureRoot),
    (error) => error instanceof OcrError && error.code === "FILE_ACCESS_DENIED",
  );

  const result = await extractTextWithTesseractNode(fixture, "image/png");
  assert.match(result.text, /Caffeine helps learners read English/i);
  assert.match(result.text, /Students can edit every sentence/i);
  assert.equal(result.provider, "tesseract");

  console.log("check:ocr OK");
}

void main();
