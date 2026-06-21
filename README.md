# Caffeine

AI-powered English learning tools for Thai students. Teachers create and publish interactive lessons; students read them with built-in sentence analysis, dictionary lookup, and Thai translations.

## What it does

**For students (public, no login)**
- Browse and read published lessons
- Click any sentence to see a grammar breakdown in Thai logic
- Inline word definitions with Thai translations

**For teachers (Google SSO)**
- Create lessons organized into folders
- Add text segments and run AI grammar analysis (LinguBreak)
- Bulk-translate segments to Thai via Gemini or DeepSeek
- Publish lessons to students
- Store personal API keys in Settings to use your own quota

## Tech stack

- **Framework** — Next.js 16 (App Router)
- **Database / Auth** — Supabase (Postgres + Google OAuth)
- **AI** — Gemini 2.5 Flash (OCR, translation, analysis), DeepSeek Chat (analysis, translation)
- **Embeddings / RAG** — OpenAI text-embedding-3-small + pgvector
- **Transcription** — Groq Whisper
- **Styling** — Tailwind CSS v4, neo-brutal design system

## Local setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your keys:

```bash
cp .env.example .env.local
```

Required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional (needed for AI features):

```env
GEMINI_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint |
| `npm run check:env` | Validate required env vars |
| `npm run check:routes` | Smoke-check API route registry |
| `npm run smoke:api` | Hit live API endpoints |
| `npm run ingest` | Ingest knowledge base docs into pgvector |

## Project structure

```
src/
  app/
    (student)/          public-facing pages (lessons, homepage)
    (admin)/            teacher dashboard (auth-gated)
    (auth)/             login / OAuth callback
    api/                API routes
  features/
    lesson-viewer/      interactive lesson reading UI
    lingubreak/         sentence grammar breakdown (LinguBreak)
    ocr/                image-to-text (Gemini Vision + Tesseract)
    transcription/      audio transcription (Groq Whisper)
    dictionary/         word lookup and Thai translation
  shared/
    lib/                services: auth, db, RAG, translation, OCR, transcription
    hooks/              shared React hooks
    types/              shared TypeScript types
  config/               RAG config, feature registry
  env/                  Zod-validated environment schemas
```

## User flow

```
Student:  / → /lessons → /lessons/[id] → read + interact

Teacher:  /login (Google SSO)
          → /dashboard
          → /dashboard/lessons → /dashboard/lessons/[id]
             ├── add segments
             ├── AI analysis (LinguBreak)
             ├── bulk translate
             └── publish → students see the lesson
```
