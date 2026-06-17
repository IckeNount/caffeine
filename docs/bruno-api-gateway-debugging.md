# Debugging API gateway configuration with Bruno

This guide explains how to use [Bruno](https://www.usebruno.com/) (an open-source, Git-friendly API client) to verify that HTTP traffic reaches your Next.js app correctly, that path prefixes match [`infra/gateway-routes.yaml`](../infra/gateway-routes.yaml), and that auth behaves as documented. It complements `npm run check:routes` (static drift checks) and `npm run smoke:api` (automated smoke).

## Why Bruno for gateway debugging

| Concern | Static checks (`check:routes`) | Smoke script | Bruno |
|--------|--------------------------------|--------------|--------|
| Nginx / reverse proxy forwards `/api` | Partial (regex on `nginx.conf`) | Hits one origin only | You choose **base URL** (direct Next vs gateway) |
| Wrong upstream / 502 / timeouts | No | No | Reproduce with **same Host / headers** as production |
| Path stripping / double slashes | No | No | Try variants manually |
| Auth cookies / session | No | Minimal | Send **Cookie** copied from browser |
| New route forgot in gateway YAML | Yes (after code change) | No | Manual exploration + checklist below |

---

## Prerequisites

1. **Install Bruno**  
   - Desktop: [Downloads](https://www.usebruno.com/downloads)  
   - Optional CLI: see [Bruno CLI](https://docs.usebruno.com/bru-cli/overview) for CI-style runs.

2. **Know your targets**  
   - **Direct Next (dev):** `http://127.0.0.1:3000` (`npm run dev` or `npm run start`)  
   - **Direct Next (Vercel):** `https://<your-deployment>.vercel.app` (no nginx in front)  
   - **Gateway in front:** whatever public URL terminates TLS and proxies to Next (e.g. load balancer using [`infra/nginx.conf`](../infra/nginx.conf) as a template)

3. **Registry reference**  
   - API prefixes and auth notes: [`infra/gateway-routes.yaml`](../infra/gateway-routes.yaml)  
   - Human-readable route table: [`infra/ROUTES.md`](../infra/ROUTES.md)

---

## Step 1 — Create a Bruno collection

1. Open Bruno → **Create Collection** (e.g. `Caffeine — API / gateway debug`).  
2. Save the collection **inside the repo** (recommended) so requests stay versioned, e.g.:

   ```text
   bruno/
     Caffeine API/
       bruno.json
       environments/
         local.bru
         vercel-preview.bru
       Public/
         Get Lessons.bru
         Get Dictionary (expect 400).bru
       Admin/
         Get Admin Lessons (expect 401).bru
   ```

3. Enable **Git integration** in collection settings if you want Bruno to manage `.bru` files cleanly alongside Git.

---

## Step 2 — Define environments (critical for gateway testing)

Create **separate environments** so you can flip between “hits Next directly” and “hits gateway” without editing every request.

### Recommended variables

| Variable | Purpose |
|----------|---------|
| `baseUrl` | Origin only, **no trailing slash** (e.g. `http://127.0.0.1:3000` or `https://api.example.com`) |
| `adminCookie` | Optional: raw `Cookie` header for teacher session (see [Auth](#auth-for-apimadmin) below) |

In Bruno: **Environments** → add `local`, `vercel-production`, `via-gateway`, etc.

**Example `local.bru` (environment file):**

```bru
vars {
  baseUrl: http://127.0.0.1:3000
}
```

**Example `via-gateway.bru`:**

```bru
vars {
  baseUrl: https://your-edge-host.example.com
}
```

Every request URL should use `{{baseUrl}}/api/...` so a single environment switch retests the full surface through a different hop.

---

## Step 3 — Baseline requests (gateway vs app)

These mirror the intent of [`scripts/smoke-api.ts`](../scripts/smoke-api.ts) and catch many misconfigurations early.

### 3.1 Public API — expect **400** (validation, not 404/502)

Confirms the path reaches the **Next** App Router handler (not HTML error page from proxy).

- **Method:** `GET`  
- **URL:** `{{baseUrl}}/api/dictionary`  
- **Query:** none  
- **Expected:** `400` with JSON body mentioning missing `word` (or similar).  

If you get **404** through the gateway but **400** direct to Next → proxy path or `location` block is wrong. If you get **502/504** → upstream / TLS / network.

### 3.2 Admin API — expect **401** without session

- **Method:** `GET`  
- **URL:** `{{baseUrl}}/api/admin/lessons`  
- **Headers:** none (no `Cookie`)  
- **Expected:** `401` with JSON like `Authentication required`.  

If you get **404** via gateway → `/api` or `/api/admin` not forwarded. If you get **200** without auth → you are not hitting the same app or middleware is bypassed (misconfiguration).

### 3.3 Unknown path — expect **404**

- **Method:** `GET`  
- **URL:** `{{baseUrl}}/api/smoke-not-a-real-endpoint-7f3a2b`  
- **Expected:** `404` (Next JSON or not-found handling).  

Useful to distinguish “gateway returns its own 404 page” (HTML) from “app 404”.

### 3.4 Happy path — public list

- **Method:** `GET`  
- **URL:** `{{baseUrl}}/api/lessons`  
- **Expected:** `200`, JSON with `lessons` array and `total`.

---

## Step 4 — Example `.bru` request files

Place under your collection folder (names are arbitrary).

**`Get Lessons.bru`**

```bru
meta {
  name: Get Lessons
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/api/lessons
  body: none
  auth: none
}
```

**`Get Dictionary expect 400.bru`**

```bru
meta {
  name: Get Dictionary (expect 400)
  type: http
  seq: 2
}

get {
  url: {{baseUrl}}/api/dictionary
  body: none
  auth: none
}
```

**`Get Admin Lessons expect 401.bru`**

```bru
meta {
  name: Get Admin Lessons (expect 401)
  type: http
  seq: 3
}

get {
  url: {{baseUrl}}/api/admin/lessons
  body: none
  auth: none
}
```

Use Bruno’s **Tests** tab (if enabled) or manual inspection to assert status codes; Bruno Golden Edition adds scripting—community edition is fine for manual gateway work.

---

## Step 5 — Compare direct Next vs gateway

Procedure:

1. Set `baseUrl` to **direct Next** (local or Vercel URL). Run the three baseline requests + `/api/lessons`. Note status codes and response **Content-Type** (`application/json` expected for these APIs).  
2. Switch environment to **gateway URL** only (same paths). Run the same requests.  
3. **Diff symptoms:**

   | Symptom | Likely cause |
   |---------|----------------|
   | Gateway: HTML 404, Direct: JSON | `location /api` missing or wrong `proxy_pass`; path prefix stripped twice |
   | Gateway: 502 / 503 | Upstream down, wrong host/port, TLS to origin failing |
   | Gateway: 301/302 loop | `X-Forwarded-Proto` / HTTPS redirect misconfiguration |
   | Gateway: 413 / timeout | Body/size/time limits on edge |
   | All JSON but wrong body | Hitting a **different** backend (wrong upstream) |

Align nginx-style fixes with [`infra/nginx.conf`](../infra/nginx.conf) (example only—adjust upstream name and ports for your stack).

---

## Step 6 — Auth for `/api/admin/*`

Student/public routes under `/api/*` (except `/api/admin`) do not require a session for listing published content. **Admin** routes are protected by Next middleware: unauthenticated calls should return **401**; authenticated non-teachers may get **403**.

Bruno does not run the browser login flow. Typical approaches:

1. **Copy Cookie header**  
   - Log in as a teacher in the browser (same deployment you are testing).  
   - DevTools → Network → any request to your app → **Request Headers** → copy full `Cookie` value.  
   - In Bruno, add header `Cookie: <pasted value>` on admin requests, or set `adminCookie` in environment and use `Cookie: {{adminCookie}}`.  
   - Cookies expire; refresh when requests flip back to 401.

2. **Separate “authenticated admin” folder** in Bruno  
   - Duplicate requests under `Admin (authenticated)/` with the Cookie header pre-filled so you do not confuse them with negative tests.

There is no project-wide “API key in header” for these admin routes in the current app design—session cookies are what middleware expects.

---

## Step 7 — Checklist against `gateway-routes.yaml`

For each `prefixes[].path` in [`infra/gateway-routes.yaml`](../infra/gateway-routes.yaml):

1. Send at least one **real** request under that prefix (e.g. `GET {{baseUrl}}/api/lessons`, `GET {{baseUrl}}/api/admin/lessons` with appropriate auth).  
2. Confirm **status** matches expectation (`auth: required` → 401 without cookie, 200/4xx with valid session as applicable).  
3. When you add a **new** top-level segment under `/api/` (not under `/api/admin`), update the YAML and run `npm run check:routes` so CI stays in sync.

---

## Step 8 — Headers worth testing behind a gateway

If behavior differs only through the proxy, try these in Bruno (as your architecture requires):

| Header | Why |
|--------|-----|
| `Host` | Virtual host routing on the edge |
| `X-Forwarded-For` / `X-Forwarded-Proto` | Apps or proxies that trust forwarded scheme/client IP |
| `Accept: application/json` | Ensures you are not accidentally content-negotiated to HTML |

Your example nginx config sets forwarding headers; verify the **real** gateway does the same.

---

## Step 9 — Workflow integration

- **Before changing gateway config:** export Bruno collection or commit `.bru` files; run baseline against **direct** and **gateway** and save example responses (redact secrets).  
- **After nginx / load balancer changes:** rerun the same environment set.  
- **In CI:** keep using `npm run check:routes` and `npm run smoke:api`; use Bruno for exploratory and production-parity debugging.  
- **Secrets:** never commit environment files containing real `Cookie` or service role keys. Use Bruno’s **secret** variables or local-only env overrides.

---

## Quick reference — project API smoke expectations

| Request | Expected (unauthenticated) |
|---------|------------------------------|
| `GET /api/dictionary` | **400** |
| `GET /api/admin/lessons` | **401** |
| `GET /api/lessons` | **200** (if DB configured) |
| `GET /api/<unknown>` | **404** |

---

## Further reading

- Bruno documentation: [https://docs.usebruno.com/](https://docs.usebruno.com/)  
- Repo route registry: [`infra/ROUTES.md`](../infra/ROUTES.md)  
- Automated smoke script: [`scripts/smoke-api.ts`](../scripts/smoke-api.ts)
