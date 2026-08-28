# Caffeine

Caffeine is an AI-assisted English sentence understanding tool for Thai learners.

Submit an English sentence to receive:

- grammatical chunks with English and Thai explanations
- the core Subject–Verb–Object structure
- a natural Thai translation
- the original chunks reordered for Thai-friendly processing
- four guided steps for understanding and rebuilding the sentence
- tappable vocabulary with Thai meanings and optional English dictionary details

The current demo focuses on LinguBreak + RAG and learner-friendly vocabulary lookup. Authentication, teacher tools, lesson management, and transcription are intentionally out of scope.

## Core flow

```text
Daily reading or image OCR → chosen sentence → /api/analyze → OpenRouter embeddings/RAG → Gemini 3.6 Flash → validated Thai learner explanation
Selected English word → /api/dictionary → MyMemory + Free Dictionary API → Thai-first dictionary card
```

LinguBreak retrieves relevant grammar, Thai learner error patterns, pedagogy, and prior examples from Supabase/pgvector. OpenRouter supplies query embeddings and daily-reading generation; direct Gemini 3.6 Flash performs structured sentence analysis. Retrieval and cache failures degrade gracefully so Gemini can still analyze the sentence.

## Learner content inputs

- **Today’s Reading** fetches a reviewed topic from Simple English Wikipedia and uses OpenRouter to create a 3–4 sentence A2–B1 paragraph for ages 10–13. The learner chooses one sentence to analyze.
- Adapted readings link to their source, identify that changes were made, and are published under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- **Scan Text** accepts JPEG, PNG, and WebP images up to 10 MB. It supports device uploads and native rear-camera capture on compatible mobile browsers.
- Image OCR runs locally with Tesseract by default, so this flow does not require or call Gemini.

## Vocabulary lookup

- Tap an English word in the result to look it up without calling an LLM.
- MyMemory supplies the Thai meaning. Free Dictionary API adds pronunciation, part of speech, an English definition, and audio when available.
- Lookup is server-side, requires no additional API key, caches successful responses, and still returns the Thai meaning if the optional English dictionary provider is unavailable.
- The dictionary card identifies its data sources and offers browser pronunciation when recorded audio is unavailable.

## OCR status

- `/api/ocr` currently uses Gemini Vision.
- `src/shared/lib/ocr/tesseract-ocr.ts` provides local, browser-side Tesseract OCR.
- Local OCR is preserved for future wiring but is not part of the current home-page demo.

## Tech stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS v4
- Gemini `gemini-3.6-flash` free tier for structured sentence analysis
- OpenRouter `openai/text-embedding-3-small`, Supabase, and pgvector for RAG
- MyMemory Translation API and Free Dictionary API for non-LLM vocabulary lookup
- Gemini Vision and Tesseract.js for the preserved OCR boundary

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

Required for RAG and analysis caching:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Required for the current demo:

```env
OPENROUTER_API_KEY=
GEMINI_API_KEY=
```

Gemini 3.6 Flash performs sentence analysis through Google's free tier. `openrouter/free` generates Today's Reading, while the preserved 1,536-dimensional RAG index uses `openai/text-embedding-3-small` through OpenRouter; embedding requests are inexpensive but are not part of the free chat router and may require OpenRouter credits.

Direct provider keys are optional and unused during normal demo execution:

```env
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
```

Their adapters remain for a future explicit fallback policy.

3. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm run check:env` | Validate the environment contract |
| `npm run health:api` | Run detailed server-only Gemini, OpenRouter, Supabase, and RAG health checks |
| `npm run check:content-inputs` | Validate daily-reading, sentence-splitting, route, and camera contracts |
| `npm run check:dictionary` | Validate full and partial free-dictionary responses |
| `npm run check:learner-ui` | Validate the Thai-first result hierarchy and vocabulary interaction contract |
| `npm run check:routes` | Compare App Router APIs with the gateway registry |
| `npm run smoke:api` | Validate API behavior against a running server |
| `npm run ingest` | Ingest the knowledge base into pgvector |

## Project structure

```text
src/
  app/
    (student)/page.tsx       public LinguBreak demo
    api/analyze/route.ts     public sentence-analysis boundary
    api/dictionary/route.ts  cached English–Thai dictionary boundary
    api/ocr/route.ts         preserved Gemini OCR boundary
  features/
    dictionary/              word lookup UI, state, schema, and free-provider client
    lingubreak/              analysis UI, runtime schema, and provider adapters
    ocr/                     preserved OCR UI building blocks
  shared/lib/
    db/                      server-side Supabase client
    rag/                     embeddings, retrieval, and prompt context
    ocr/                     Gemini OCR and local Tesseract
  config/rag.ts              retrieval and provenance configuration
knowledge-base/
  grammar/                   English grammar knowledge
  errors/                    common Thai learner mistakes
  pedagogy/                  Thai-oriented teaching methods
```

## Future v2

A future backend may move `/api/analyze` behind AWS API Gateway/Lambda and enable the dormant direct-provider adapters as explicit fallbacks. Automatic fallback and those infrastructure concerns are deliberately not implemented in this demo; the existing API boundary keeps that migration possible without coupling the UI to future infrastructure.
