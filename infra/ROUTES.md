# Route registry

API handlers live under `src/app/**/route.ts`. Gateway expectations are tracked in:

- [`gateway-routes.yaml`](gateway-routes.yaml) — API path prefixes and auth notes (diffed by `npm run check:routes`)
- [`nginx.conf`](nginx.conf) — example `location /api/` proxy to the Next upstream

| Route pattern | Service | Gateway registered | Auth required | Notes |
| --- | --- | --- | --- | --- |
| `/api/analyze` | Next | `/api/analyze` | No | LinguBreak + RAG sentence analysis |
| `/api/daily-reading` | Next | `/api/daily-reading` | No | Cached A2–B1 reading adapted from a reviewed Simple English Wikipedia topic |
| `/api/ocr` | Next | `/api/ocr` | Feature gate | Optional Gemini OCR; `POST` is unavailable unless `OCR_CLOUD_ENABLED=true` and the learner explicitly consents |

Run `npm run check:routes` in CI to list handlers, verify nginx `/api`, and diff namespaces against `gateway-routes.yaml`. After `npm run build`, run `npm run start` and `npm run smoke:api` for HTTP validation checks.
