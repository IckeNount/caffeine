/**
 * HTTP smoke checks against a running Next server (local CI or staging).
 * Expects env from the same contract as production builds.
 *
 * Usage: `npm run start` then `BASE_URL=http://127.0.0.1:3000 npm run smoke:api`
 */
import { DailyReadingSchema } from "../src/features/daily-reading/lib/schema";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function expectStatus(
  path: string,
  expected: number,
  label: string,
  init?: RequestInit,
): Promise<void> {
  const url = `${base.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, { redirect: "manual", ...init });
  if (res.status !== expected) {
    console.error(
      `smoke:api FAIL ${label}: ${url} → ${res.status} (expected ${expected})`,
    );
    process.exit(1);
  }
  console.log(`smoke:api OK ${label}: ${res.status}`);
}

async function expectDailyReading(): Promise<void> {
  const url = `${base.replace(/\/$/, "")}/api/daily-reading`;
  const res = await fetch(url, { redirect: "manual" });
  const body = (await res.json()) as unknown;

  if (res.status === 200) {
    DailyReadingSchema.parse(body);
    if (!res.headers.get("cache-control")?.includes("s-maxage=86400")) {
      console.error(
        `smoke:api FAIL public daily reading: ${url} is missing its daily shared-cache policy`,
      );
      process.exit(1);
    }
  } else if (
    res.status !== 503 ||
    !body ||
    typeof body !== "object" ||
    !("error" in body) ||
    body.error !== "Today's reading is temporarily unavailable. Please try again."
  ) {
    console.error(
      `smoke:api FAIL public daily reading: ${url} → ${res.status} (expected validated 200 or sanitized 503)`,
    );
    process.exit(1);
  }
  console.log(`smoke:api OK public daily reading: ${res.status}`);
}

async function main() {
  await expectDailyReading();
  await expectStatus(
    "/api/analyze",
    400,
    "public analysis validation (empty sentence)",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: "" }),
    },
  );
  await expectStatus(
    "/api/analyze",
    400,
    "public analysis validation (direct provider disabled)",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: "This is a test.", provider: "deepseek" }),
    },
  );
  await expectStatus(
    "/api/ocr",
    404,
    "cloud OCR production gate",
    { method: "POST", body: new FormData() },
  );
  await expectStatus(
    "/api/smoke-not-a-real-endpoint-7f3a2b",
    404,
    "unknown API path",
  );
}

main().catch((e) => {
  console.error("smoke:api error:", e);
  process.exit(1);
});
