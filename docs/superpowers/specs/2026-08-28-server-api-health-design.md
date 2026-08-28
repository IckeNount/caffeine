# Server API Health Design

## Scope

Add a server-only diagnostic function and CLI command. Do not add an HTTP route, UI, authentication secret, retry policy, monitoring service, or provider fallback.

## Checks

The report will verify the required environment contract, authenticate the configured OpenRouter key, request a real LinguBreak response through `openrouter/free` using the existing strict `AnalysisResult` schema, generate an embedding through the existing 1,536-dimensional route, read the Supabase tables used by the demo, and invoke both RAG match functions with that embedding.

Each check reports `pass`, `fail`, or `skipped`, its elapsed time, safe diagnostic details, and a redacted error when applicable. Any failed or skipped required check makes the overall report unhealthy and the CLI exits non-zero.

## Safety

The command loads `.env.local` without printing credentials. It never returns generated LinguBreak content, raw provider responses, API-key labels, or service-role values. The structured-output probe calls the provider adapter directly, so it does not read or write the analysis cache.
