# Caffeine Demo-Core Architecture

## Product boundary

Caffeine is a public English sentence-analysis demo for Thai learners. The runtime product has no account, teacher, lesson, dictionary, or transcription domain.

```text
Browser
  └── / — LinguBreak demo
        └── POST /api/analyze
              ├── analysis cache (Supabase)
              ├── OpenAI embedding
              ├── pgvector grammar/pedagogy retrieval
              ├── DeepSeek or Gemini structured generation
              └── non-blocking cache persistence
```

## LinguBreak contract

The API returns the structured `AnalysisResult` fields:

```text
chunks
simplified_english
thai_translation
thai_reordered_chunks
pedagogical_steps
```

The prompt teaches core SVO recognition, relative clauses and the Thai `ที่` bridge, modifiers, Thai-friendly reconstruction, Thai grammar explanation, and natural translation. RAG context is bounded by `src/config/rag.ts`; a retrieval failure falls back to the preserved Thai-specific prompt.

## OCR boundary

`POST /api/ocr` uses Gemini Vision. `src/shared/lib/ocr/tesseract-ocr.ts` provides a separate local browser implementation and is preserved for future local-first UI wiring.

## Data boundary

Supabase remains required for the knowledge base, pgvector retrieval, provenance, and cached analyses. Removing Supabase Auth does not remove the server-side Supabase data dependency.

## Future migration

The UI depends only on `/api/analyze`. A future deployment can move that endpoint behind AWS API Gateway/Lambda or introduce provider fallback without rewriting the browser UI. No speculative gateway, auth, or orchestration layer exists today.
