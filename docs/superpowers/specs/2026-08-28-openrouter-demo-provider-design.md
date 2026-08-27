# OpenRouter Demo Provider Design

## Goal

Make OpenRouter the only active and required LLM provider for the Caffeine demo while retaining dormant direct-provider adapters for later fallback work.

## Runtime Flow

```text
Guest sentence
  -> /api/analyze
  -> OpenRouter embeddings (openai/text-embedding-3-small, 1536 dimensions)
  -> existing Supabase/pgvector RAG
  -> OpenRouter chat (openrouter/free)
  -> strict JSON Schema response
  -> runtime AnalysisResult validation
  -> existing cache and UI
```

`openrouter/free` is the only selectable demo provider. Direct DeepSeek and Gemini analysis functions and the direct OpenAI embedding adapter remain exported but dormant; normal analysis and ingestion never call them.

## Constraints

- Preserve the LinguBreak system/user prompts and `AnalysisResult` fields.
- Preserve RAG, pgvector dimensions, cache behavior, and provenance.
- Record `provider = openrouter` and the actual model returned by OpenRouter when available.
- Require `OPENROUTER_API_KEY`; keep direct-provider keys optional.
- Do not add automatic fallback, retries, health checks, benchmarking, model discovery, AWS work, or UI features.
- Keep the existing 1536-dimensional embedding model through OpenRouter. The available free OpenRouter embedding model is 1024-dimensional and would require an out-of-scope database migration.

## Validation and Errors

OpenRouter receives a strict JSON Schema response format and `require_parameters: true`. The parsed JSON is then validated locally with the same runtime schema before it reaches caching or the UI. Invalid cached results are treated as cache misses. Existing API status mapping remains in place.

## Verification

Run environment, route, typecheck, lint, build, and live API smoke checks. A live structured analysis requires the user to set `OPENROUTER_API_KEY` locally.
