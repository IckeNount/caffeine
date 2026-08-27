# Caffeine

Caffeine is an AI-assisted English sentence understanding tool for Thai learners.

Submit an English sentence to receive:

- grammatical chunks with English and Thai explanations
- the core Subject–Verb–Object structure
- a natural Thai translation
- the original chunks reordered for Thai-friendly processing
- four guided steps for understanding and rebuilding the sentence

The current demo focuses on LinguBreak + RAG. Authentication, teacher tools, lesson management, dictionary lookup, and transcription are intentionally out of scope.

## Core flow

```text
Guest sentence → /api/analyze → cache/RAG → LinguBreak → structured Thai learner explanation
```

LinguBreak retrieves relevant grammar, Thai learner error patterns, pedagogy, and prior examples from Supabase/pgvector. Retrieval and cache failures degrade gracefully so the selected model can still analyze the sentence.

## OCR status

- `/api/ocr` currently uses Gemini Vision.
- `src/shared/lib/ocr/tesseract-ocr.ts` provides local, browser-side Tesseract OCR.
- Local OCR is preserved for future wiring but is not part of the current home-page demo.

## Tech stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS v4
- DeepSeek Chat and Gemini for structured sentence analysis
- OpenAI `text-embedding-3-small`, Supabase, and pgvector for RAG
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

Configure the services you use:

```env
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
GEMINI_API_KEY=
```

`OPENAI_API_KEY` enables embeddings/RAG. DeepSeek and Gemini keys enable their corresponding analysis providers; Gemini also powers `/api/ocr`.

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
| `npm run check:routes` | Compare App Router APIs with the gateway registry |
| `npm run smoke:api` | Validate API behavior against a running server |
| `npm run ingest` | Ingest the knowledge base into pgvector |

## Project structure

```text
src/
  app/
    (student)/page.tsx       public LinguBreak demo
    api/analyze/route.ts     public sentence-analysis boundary
    api/ocr/route.ts         preserved Gemini OCR boundary
  features/
    lingubreak/              analysis UI, hook, schema, and providers
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

A future backend may move `/api/analyze` behind AWS API Gateway/Lambda and add model fallback or saved history. Those concerns are deliberately not implemented in this demo refactor; the existing API boundary keeps that migration possible without coupling the UI to future infrastructure.
