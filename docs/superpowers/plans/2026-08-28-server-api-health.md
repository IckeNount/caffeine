# Server API Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a detailed server-only command that verifies the live OpenRouter, Supabase, embedding, and RAG dependencies used by the Caffeine demo.

**Architecture:** A reusable `checkApiHealth(): Promise<ApiHealthReport>` function owns check execution and sanitization. A thin `tsx` script loads `.env.local`, prints the JSON report, and sets a failing exit code when any required dependency is unhealthy.

**Tech Stack:** TypeScript, Node.js fetch, OpenAI SDK, OpenRouter, Supabase, Zod, tsx.

## Global Constraints

- Keep health diagnostics server-only; do not add an HTTP route or UI.
- Use the existing OpenRouter adapters and `openrouter/free` strict LinguBreak schema.
- Do not write cache or provenance records while probing.
- Do not add dependencies, retries, fallback providers, or monitoring infrastructure.
- Never expose API keys, Supabase service-role values, raw responses, or generated analysis content.

---

### Task 1: Reusable health checks

**Files:**
- Create: `src/shared/lib/health/check-api-health.ts`
- Modify: `src/features/lingubreak/lib/ai-providers.ts`

**Interfaces:**
- Consumes: `analyzeWithOpenRouter(sentence, ragContext)`, `embedText(text)`, `EMBEDDING_DIM`, and `supabaseAdmin`.
- Produces: `checkApiHealth(): Promise<ApiHealthReport>` with per-check status, latency, details, and sanitized error.

- [x] **Step 1: Export the existing OpenRouter adapter**

Change `analyzeWithOpenRouter` from a private function to an exported function. Keep its prompt, request, validation, and normal caller unchanged.

- [x] **Step 2: Add the health report contract**

Define `HealthCheckStatus = "pass" | "fail" | "skipped"`, `ApiHealthCheck`, and `ApiHealthReport`. The report status is `healthy` only when every check passes.

- [x] **Step 3: Add six bounded checks**

Run `environment`, `openrouter-auth`, `structured-analysis`, `embedding`, `supabase-tables`, and `rag-rpcs`. Use `GET https://openrouter.ai/api/v1/key` for authentication, the exported adapter for schema validation, and the generated embedding for both RAG RPCs. Redact `sk-*` tokens and configured secret values from errors.

- [x] **Step 4: Verify the module statically**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript diagnostics.

### Task 2: CLI wiring and documentation

**Files:**
- Create: `scripts/check-api-health.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `checkApiHealth()`.
- Produces: `npm run health:api`, JSON output, and exit code 1 for an unhealthy report.

- [x] **Step 1: Add the CLI**

Load `.env.local` with `dotenv.config({ path: join(process.cwd(), ".env.local"), quiet: true })`, dynamically import the health module after loading variables, print its report as formatted JSON, and set `process.exitCode = 1` when unhealthy.

- [x] **Step 2: Register and document the command**

Add `"health:api": "tsx scripts/check-api-health.ts"` to `package.json` and a server-only health-check command to the README verification section.

- [x] **Step 3: Run the live health check**

Run: `npm run health:api`

Expected: a redaction-safe JSON report; `healthy` when all configured live services pass, otherwise a non-zero result naming the failing dependency.

### Task 3: Repository verification

**Files:** No additional files.

- [x] **Step 1: Run focused contracts**

Run: `npm run check:env && npm run check:routes`

Expected: both commands exit 0.

- [x] **Step 2: Run static verification**

Run: `npm run typecheck && npm run lint`

Expected: both commands exit 0.

- [x] **Step 3: Run the production build**

Run: `npm run build`

Expected: Next.js production compilation exits 0 and no `/api/health` route appears.
