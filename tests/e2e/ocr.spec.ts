import path from "node:path";
import { expect, test } from "@playwright/test";

test("learner can review and select text extracted locally", async ({ page }) => {
  let cloudPostCount = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/ocr")) {
      cloudPostCount += 1;
    }
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Scan/ }).click();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(
      path.join(process.cwd(), "tests/fixtures/ocr/clean-english.jpg"),
    );

  const review = page.getByLabel("Review the extracted text");
  await expect(review).toBeVisible({ timeout: 150_000 });
  await expect(review).toContainText(/Caffeine helps learners read English/i);

  await review.fill(
    "Caffeine helps learners read English. Students can edit every sentence.",
  );
  await page
    .getByRole("button", { name: /Students can edit every sentence/i })
    .click();

  await expect(page.locator("#sentence-input")).toHaveValue(
    "Students can edit every sentence.",
  );
  expect(cloudPostCount).toBe(0);
});
