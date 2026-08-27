# Caffeine Demo-Core Refactor Design

## Goal

Reduce Caffeine to a public, demo-ready LinguBreak sentence-analysis product for Thai learners without rewriting its proven analysis, RAG, caching, or OCR foundations.

## Architecture

```text
/ -> LinguBreak demo UI -> /api/analyze -> cache -> RAG -> OpenRouter
                                                -> structured Thai learner result

/api/ocr -> Gemini Vision
local optional OCR capability -> Tesseract.js
```

The existing `/api/analyze` boundary remains the only interface between the browser and LinguBreak. It becomes public, while Supabase continues serving RAG, pgvector retrieval, and analysis caching rather than authentication.

## Runtime Surface

The home page is the complete demo. It composes the existing sentence input, provider switcher, chunk display, English/Thai comparison, reconstruction, and pedagogical steps. It introduces no navigation, account, lesson, history, or dashboard concepts.

The following runtime systems are removed end-to-end because they are outside demo scope and have no required dependency from LinguBreak:

- teacher/admin authentication and authorization
- lesson authoring, publishing, browsing, and viewing
- folders and teacher settings
- dictionary lookup
- transcription and transcription history

OCR remains secondary and is not added to the home page. The current `/api/ocr` route remains Gemini-backed, and the existing client-side Tesseract implementation remains available for future local-first wiring.

## Analysis Data Flow

1. The guest submits a trimmed English sentence and a supported provider.
2. `/api/analyze` validates the JSON body, sentence type and length, and the OpenRouter provider.
3. LinguBreak checks the existing analysis cache.
4. On a cache miss, it embeds the sentence and retrieves bounded grammar, pedagogy, Thai-error, and prior-analysis context.
5. RAG failures degrade to the existing prompt-only fallback.
6. OpenRouter's free model router returns the existing structured `AnalysisResult`.
7. Cache persistence remains non-blocking and records the existing provenance.
8. The UI renders chunks, core SVO, Thai translation, Thai-friendly ordering, and pedagogical steps.

The `AnalysisResult` contract and Thai-specific system prompt are unchanged.

## Error Handling

- Malformed JSON, invalid sentence values, overlong input, and unsupported providers return `400`.
- Provider rate or quota failures return `429`.
- Provider configuration failures are server configuration errors and do not imply guest authentication.
- Other provider failures return `500` with a stable user-facing message.
- Cache and RAG failures continue to be non-fatal.

## Verification

Repository searches confirm obsolete runtime concepts and imports are gone. HTTP smoke coverage checks public analysis validation. Final verification runs `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run check:routes` without browser automation.

## Database Boundary

No database migration is performed. Old teacher, lesson, folder, publication, translation-job, and transcription tables may remain in Supabase for later audited cleanup.
