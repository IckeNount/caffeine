# Caffeine Demo-Core Refactor Implementation Plan

> **For agentic workers:** Execute the checked steps in order and verify each independently.

**Goal:** Deliver a public LinguBreak + RAG demo for Thai learners and remove the obsolete teacher/lesson, dictionary, and transcription product surfaces.

**Architecture:** The root page composes existing LinguBreak UI and calls the public `/api/analyze` boundary. The analysis engine retains cache, RAG fallback, providers, schema, and provenance; OCR remains unchanged and separate.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase/pgvector, OpenRouter, Tesseract.js.

## Global Constraints

- Preserve `AnalysisResult`, the Thai-specific prompt, RAG, grammar/pedagogy knowledge, caching, and Tesseract.
- Do not add auth, provider orchestration, infrastructure, frameworks, or database migrations.
- Do not redesign the UI or switch the OCR route away from Gemini.
- Remove dictionary and transcription as confirmed by the user.

---

### Task 1: Remove obsolete runtime systems

**Files:** Delete the admin/auth/lesson page and API trees, lesson viewer, lesson libraries and types, dictionary, transcription, translation, middleware, and auth-only Supabase helpers.

**Interfaces:** Preserve `/api/analyze`, `/api/ocr`, `src/features/lingubreak/**`, `src/shared/lib/rag/**`, and `src/shared/lib/ocr/**`.

- [x] Delete only dependency-audited obsolete files.
- [x] Run `npm run typecheck` and fix removal-induced import errors.

### Task 2: Expose the guest LinguBreak demo

**Files:** Modify `src/app/(student)/page.tsx`, `src/app/(student)/layout.tsx`, `src/app/layout.tsx`, `src/app/api/analyze/route.ts`, and `src/features/lingubreak/hooks/useAnalyze.ts`.

**Interfaces:** `POST /api/analyze` consumes `{ sentence: string, provider: "openrouter" }` and produces `AnalysisResult` or `{ error: string }`.

- [x] Compose all existing LinguBreak result components on `/`.
- [x] Remove teacher authorization and cookie credentials.
- [x] Return `400` for malformed payloads and unsupported providers.
- [x] Correct the existing reconstruction-state lint failure without changing behavior.

### Task 3: Clean dependencies and deployment contracts

**Files:** Modify `package.json`, `package-lock.json`, `src/env/schema.ts`, `.env.example`, `.env.production.example`, `infra/gateway-routes.yaml`, `infra/ROUTES.md`, and `scripts/smoke-api.ts`; delete unused client/middleware environment modules.

- [x] Remove `@supabase/ssr` and `groq-sdk` after confirming no imports remain.
- [x] Remove auth-only anon-key and transcription environment fields.
- [x] Register only surviving API namespaces and make smoke checks reflect guest analysis.

### Task 4: Update product documentation

**Files:** Modify `README.md`; delete obsolete teacher-dashboard documentation; add a concise obsolete-database report.

- [x] Describe LinguBreak + RAG as the current product.
- [x] Accurately document Gemini server OCR and preserved local Tesseract.
- [x] List suspected obsolete database objects without migrating them.

### Task 5: Verify the completed refactor

- [x] Run stale-concept and import searches.
- [x] Run `npm run typecheck` and expect exit 0.
- [x] Run `npm run lint` and expect exit 0.
- [x] Run `npm run build` and expect exit 0.
- [x] Run `npm run check:routes` and expect exit 0.
- [x] Start the production server and run focused HTTP validation if the local environment permits it.
