/**
 * HTTP smoke checks against a running Next server (local CI or staging).
 * Expects env from the same contract as production builds.
 *
 * Usage: `npm run start` then `BASE_URL=http://127.0.0.1:3000 npm run smoke:api`
 */
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

async function main() {
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
    "public analysis validation (unsupported provider)",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: "This is a test.", provider: "unknown" }),
    },
  );
  await expectStatus(
    "/api/ocr",
    400,
    "public OCR validation (missing image)",
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
