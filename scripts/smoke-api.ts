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
): Promise<void> {
  const url = `${base.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, { redirect: "manual" });
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
    "/api/dictionary",
    400,
    "public API validation (missing word)",
  );
  await expectStatus("/api/admin/lessons", 401, "admin API unauthenticated");
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
