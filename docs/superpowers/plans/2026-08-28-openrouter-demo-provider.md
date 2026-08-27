# OpenRouter Demo Provider Implementation Plan

> **For agentic workers:** Execute these checkbox steps in order and keep direct-provider adapters dormant.

**Goal:** Route all normal Caffeine demo analysis and RAG embeddings through OpenRouter using `openrouter/free` for generation.

**Architecture:** Reuse the installed OpenAI SDK against OpenRouter's OpenAI-compatible base URL. Enforce the existing LinguBreak result contract with a strict Zod/JSON Schema at the provider boundary and keep direct adapters exported but unselected.

**Tech Stack:** TypeScript, OpenAI SDK, OpenRouter API, Zod 4, Supabase/pgvector.

## Global Constraints

- `OPENROUTER_API_KEY` is the only required LLM key.
- Preserve the current LinguBreak prompt, RAG pipeline, `AnalysisResult`, caching, and UI contract.
- Use `openrouter/free`, not a hard-coded free model.
- Do not implement direct-provider fallback or unrelated architecture.

---

### Task 1: Runtime schema and OpenRouter adapter

**Files:** Modify `src/features/lingubreak/lib/schema.ts`, `src/features/lingubreak/lib/ai-providers.ts`, and `src/features/lingubreak/lib/providers.ts`.

- [ ] Add a runtime Zod schema matching every existing `AnalysisResult` field.
- [ ] Add the OpenRouter `openrouter/free` adapter with strict JSON Schema output.
- [ ] Validate fresh and cached analysis payloads before returning them.
- [ ] Record OpenRouter and the selected response model in cache provenance.
- [ ] Keep direct DeepSeek and Gemini adapters exported but unreachable from normal execution.

### Task 2: OpenRouter-only RAG embeddings

**Files:** Modify `src/shared/lib/rag/embeddings.ts` and `scripts/ingest.ts`.

- [ ] Point runtime and ingestion embedding calls to `https://openrouter.ai/api/v1` with `OPENROUTER_API_KEY`.
- [ ] Use `openai/text-embedding-3-small` and preserve 1536 dimensions.
- [ ] Keep a dormant direct OpenAI embedding adapter for future fallback.

### Task 3: Public provider and environment contract

**Files:** Modify `src/app/api/analyze/route.ts`, `src/app/(student)/page.tsx`, `src/env/schema.ts`, `.env.example`, `.env.production.example`, `README.md`, and focused smoke checks.

- [ ] Default and validate only `openrouter` in the demo API/UI.
- [ ] Require `OPENROUTER_API_KEY`; keep direct keys optional.
- [ ] Document that free chat routing does not make the preserved OpenAI embedding model free.

### Task 4: Verification

- [ ] Run `npm run check:env`, `npm run check:routes`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Run live smoke validation and a structured analysis when `OPENROUTER_API_KEY` is set.
- [ ] Search for normal execution paths that still select direct providers.
