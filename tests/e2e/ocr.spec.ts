import path from "node:path";
import { expect, test } from "@playwright/test";

test("learner can review and batch-analyze text extracted locally", async ({ page }) => {
  let cloudPostCount = 0;
  let batchPostCount = 0;
  let singlePostCount = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/ocr")) {
      cloudPostCount += 1;
    }
    if (request.method() === "POST" && request.url().endsWith("/api/analyze-batch")) {
      batchPostCount += 1;
    }
    if (request.method() === "POST" && request.url().endsWith("/api/analyze")) {
      singlePostCount += 1;
    }
  });

  await page.route("**/api/analyze-batch", async (route) => {
    const sentences = (route.request().postDataJSON() as { sentences: string[] }).sentences;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: sentences.map((sentence) => ({
          sentence,
          source: "generated",
          result: {
            chunks: [],
            simplified_english: sentence,
            thai_translation: "คำแปลทดสอบ",
            thai_reordered_chunks: [],
            pedagogical_steps: [],
          },
        })),
        usage: {
          generatedSentences: sentences.length,
          cachedSentences: 0,
          promptTokens: 20,
          outputTokens: 40,
          totalTokens: 60,
        },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Scan/ }).click();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(
      path.join(process.cwd(), "tests/fixtures/ocr/clean-english.jpg"),
    );

  const review = page.getByLabel(/Review extracted text/);
  await expect(review).toBeVisible({ timeout: 150_000 });
  await expect(review).toContainText(/Caffeine helps learners read English/i);

  await review.fill(
    "Caffeine helps learners read English. Students can edit every sentence.",
  );
  await page.getByRole("button", { name: /Break down all sentences/i }).click();
  await page
    .getByRole("button", { name: /Students can edit every sentence/i })
    .click();

  await expect(page.locator("#sentence-input")).toHaveCount(0);
  await expect(page.getByText("คำแปลทดสอบ")).toBeVisible();
  expect(cloudPostCount).toBe(0);
  expect(batchPostCount).toBe(1);
  expect(singlePostCount).toBe(0);
});
