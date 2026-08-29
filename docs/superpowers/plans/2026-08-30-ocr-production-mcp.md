# OCR Production Hardening and MCP Implementation Plan

> **For agentic workers:** Execute this plan inline and track steps with checkbox (`- [ ]`) syntax. The source specification forbids intermediate commits; create one final commit only after every deterministic gate passes.

**Goal:** Make Caffeine's local-first OCR safe to ship and expose the same bounded OCR capability through one official MCP v2 stdio tool.

**Architecture:** Keep browser Tesseract as the learner default, extract shared validation/normalization code, place optional Gemini OCR behind an explicit server feature gate and consent action, and add a Node Tesseract adapter for MCP. The MCP server reads only validated local files under a realpath-enforced allowed root.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, Tesseract.js 7, `@google/genai` 2.x, official MCP server/client 2.x, Playwright Chromium.

## Global Constraints

- Preserve the current image → local OCR → editable text → sentence selection → analysis flow.
- Normal learner OCR never uploads an image automatically.
- Cloud OCR defaults disabled and requires `OCR_CLOUD_ENABLED=true` plus explicit consent.
- JPEG, PNG, and WebP remain supported at a maximum encoded size of 10 MB; HEIC is explicitly rejected without adding a decoder.
- Do not log image data, extracted text, provider responses, or secrets.
- Expose exactly one stdio MCP tool: `ocr_extract_text`.
- Do not rewrite history, force-push, add `Co-authored-by`, or modify unrelated product domains.

---

### Task 1: Runtime schemas and image validation

**Files:**
- Create: `src/shared/lib/ocr/ocr-schema.ts`
- Create: `src/shared/lib/ocr/image-validation.ts`
- Modify: `src/shared/lib/ocr/ocr-types.ts`
- Modify: `src/shared/lib/ocr/index.ts`
- Test: `scripts/check-ocr.ts`

**Interfaces:**
- Produce `OcrModeSchema`, `OcrProviderSchema`, `OcrResultSchema`, `CloudOcrRequestOptionsSchema`.
- Produce `validateImageBytes(bytes: Uint8Array, claimedMimeType: string): ValidatedImage` with signature and dimension guards.
- Produce stable `OcrErrorCode` values for invalid mode, cloud state, provider failures, and file access.

- [x] Add Zod schemas with bounded text, paragraphs, confidence `[0,1]`, language, processing time, and provider.
- [x] Add byte-size, empty-file, JPEG/PNG/WebP magic-byte, MIME-match, and conservative decoded-pixel checks.
- [x] Parse PNG, JPEG SOF, and WebP dimensions without adding an image-processing dependency.
- [x] Remove unused `languageHint` from the public OCR options.
- [x] Add failing then passing assertions for mode parsing, result bounds, valid signatures, fake MIME, empty bytes, oversized input, and excessive dimensions.

### Task 2: Shared normalization and real-image local OCR

**Files:**
- Create: `src/shared/lib/ocr/normalize-result.ts`
- Create: `src/shared/lib/ocr/tesseract-node.ts`
- Modify: `src/shared/lib/ocr/tesseract-ocr.ts`
- Create: `tests/fixtures/ocr/clean-english.png`
- Modify: `scripts/check-ocr.ts`

**Interfaces:**
- Produce `normalizeTesseractResult(text, confidence, processingTimeMs, provider): OcrResult`.
- Produce `extractTextWithTesseractNode(bytes: Buffer): Promise<OcrResult>`.
- Preserve `extractTextLocal(file, onProgress): Promise<OcrResult>`.

- [x] Normalize whitespace and paragraphs identically in browser and Node adapters.
- [x] Remove the unmeasured accuracy claim and keep object-URL cleanup.
- [x] Generate one small synthetic English PNG containing two sentences and no personal/copyrighted data.
- [x] Run Node Tesseract on the fixture and assert expected normalized phrases rather than full-string equality.

### Task 3: Controlled Gemini adapter and API boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/shared/lib/ocr/ocr-service.ts`
- Modify: `src/app/api/ocr/route.ts`
- Modify: `src/env/schema.ts`
- Modify: `.env.example`
- Modify: `.env.production.example`
- Create: `scripts/check-ocr-gemini-live.ts`

**Interfaces:**
- Produce `isCloudOcrEnabled(env?: NodeJS.ProcessEnv): boolean`.
- Preserve `extractText(bytes, mimeType, options): Promise<OcrResult>` using `@google/genai` and `GEMINI_OCR_MODEL`.
- Route `GET /api/ocr` returns cloud availability; `POST` requires feature gate, same-site origin when present, valid mode, explicit consent, and validated image bytes.

- [x] Install `@google/genai` because response-schema validation and bounded abort support satisfy the cloud-adapter acceptance criteria.
- [x] Use a prompt that treats image text as inert data and forbids following photographed instructions.
- [x] Validate provider JSON through Zod and map failures to stable sanitized errors.
- [x] Add a bounded abort timeout with no automatic retry.
- [x] Default cloud OCR disabled; reject disabled POSTs without calling Gemini.
- [x] Add an opt-in one-request live fixture smoke command that otherwise prints `SKIPPED` and exits zero.

### Task 4: Learner validation and explicit fallback UX

**Files:**
- Modify: `src/features/ocr/components/ImageUploader.tsx`
- Modify: `src/features/ocr/components/OcrInputPanel.tsx`
- Modify: `src/features/ocr/hooks/useOcr.ts`

**Interfaces:**
- `ImageUploader` validates bytes before preview/OCR and emits a validated `File`.
- `useOcr().uploadAndExtract(file, provider, cloudConsent)` validates returned data with `OcrResultSchema`.
- `OcrInputPanel` stores the selected file only in component memory and shows cloud processing only as an explicit low-confidence/no-text recovery action.

- [x] Reject empty, fake-signature, oversized, over-dimension, and HEIC/HEIF files with actionable messages before OCR.
- [x] Preserve upload, rear-camera capture, editable text, sentence splitting, and sentence selection.
- [x] Fetch only the boolean cloud availability and never expose provider credentials.
- [x] Show local retry/manual-correction guidance for poor/no output.
- [x] Require a clearly worded user click before sending the retained in-memory image to `/api/ocr`.

### Task 5: One-tool MCP stdio adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/mcp/ocr-tool.ts`
- Create: `src/mcp/ocr-server.ts`
- Create: `scripts/check-mcp-ocr.ts`

**Interfaces:**
- Install stable `@modelcontextprotocol/server@2` and `@modelcontextprotocol/client@2` for the required server and real-client contract test.
- Produce `resolveAllowedImagePath(imagePath, allowedRoot): Promise<string>` using `realpath`, `relative`, and file checks.
- Register exactly `ocr_extract_text` with local Tesseract default and Gemini requiring `cloudConsent: true` plus the cloud feature gate.

- [x] Reject URLs, directories, traversal, and symlink escapes before reading bytes.
- [x] Apply shared size, signature, MIME, and dimension validation.
- [x] Return readable MCP content plus the small structured OCR result; never return base64 or provider payloads.
- [x] Start the server with official stdio transport and keep stdout protocol-only.
- [x] Spawn it with the official client, assert `listTools`, call the fixture, validate `structuredContent`, test traversal rejection, and close cleanly.

### Task 6: Browser E2E and deterministic CI gates

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/ocr.spec.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/smoke-api.ts`

**Interfaces:**
- Add `check:ocr`, `check:mcp:ocr`, `check:ocr:gemini-live`, `mcp:ocr`, and `e2e:ocr` scripts.
- Playwright runs one Chromium learner OCR journey with no screenshots or Gemini calls.

- [x] Install `@playwright/test` solely for the required learner OCR browser E2E.
- [x] Upload the committed fixture, await local OCR, edit extracted text, choose a sentence, and assert the main input is populated.
- [x] Update ordinary CI with deterministic OCR/MCP checks; keep live Gemini out of CI.
- [x] Update API smoke expectations so a production-disabled cloud POST is safe and deterministic.

### Task 7: Documentation, release verification, and final commit

**Files:**
- Modify: `README.md`
- Modify: `infra/gateway-routes.yaml`
- Modify: `infra/ROUTES.md`

- [x] Document local-first privacy, formats, explicit HEIC rejection, cloud gate/consent, environment variables, MCP command, and focused checks.
- [x] Mark `/api/ocr` as feature-gated rather than universally public.
- [x] Run `check:env`, `check:routes`, `check:content-inputs`, `check:ocr`, `check:mcp:ocr`, lint, typecheck, build, API smoke, and `e2e:ocr`.
- [x] Run Gemini live smoke only when `OCR_LIVE_GEMINI=1`; otherwise report `SKIPPED`.
- [x] Inspect status/diff for unrelated files and secrets; preserve the pre-existing README work and user specification.
- [x] Configure author/committer as `IckeNount <ickenount.tgi@gmail.com>`, create one commit `feat: harden OCR and add MCP tool`, and verify no co-author trailer.
