# Route registry (Next.js monolith + gateway docs)

API handlers live under `src/app/**/route.ts`. Gateway expectations are tracked in:

- [`gateway-routes.yaml`](gateway-routes.yaml) — API path prefixes and auth notes (diffed by `npm run check:routes`)
- [`nginx.conf`](nginx.conf) — example `location /api/` proxy to the Next upstream

| Route pattern   | Service | Gateway registered | Auth required | Notes        |
| --------------- | ------- | ------------------ | ------------- | ------------ |
| `/api/*`        | Next    | `gateway-routes.yaml` | Varies        | See YAML `auth` |
| `/api/admin/*`  | Next    | `/api/admin`       | Yes (middleware) | Returns 401 if no session |
| `/dashboard/*`  | Next    | N/A (same host)    | Yes (middleware) | Teacher UI   |
| `/login`        | Next    | N/A                | No            |              |
| `/auth/*`       | Next    | N/A                | Varies        | OAuth callback / signout |

Run `npm run check:routes` in CI to list handlers, verify nginx `/api`, and diff namespaces vs `gateway-routes.yaml`. After `npm run build`, run `npm run start` and `npm run smoke:api` for HTTP checks (also in CI).
