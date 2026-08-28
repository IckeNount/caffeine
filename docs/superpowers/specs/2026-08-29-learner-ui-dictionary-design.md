# Young Learner UI and Dictionary Design

**Date:** 2026-08-29  
**Status:** Approved direction, implementation-ready  
**Implementation target:** Next.js App Router

## User and product context

Caffeine helps Thai learners ages 10–13 understand English sentences. The current dark neo-brutalist interface makes Thai explanations small and low-contrast, and the colored grammar chunks resemble vocabulary buttons without providing dictionary lookup.

The redesign must make Thai comfortable to read, make every interaction's purpose obvious, and let learners look up English words without spending LLM tokens. It must preserve the existing sentence-analysis request and `AnalysisResult` contract.

## Goals

- Present the natural Thai translation immediately after analysis.
- Let learners tap individual English words for English→Thai dictionary help.
- Use free, non-LLM dictionary and translation services.
- Distinguish word lookup from grammar-chunk explanations.
- Make Thai typography readable on mobile and desktop.
- Keep the current Today’s Reading, scan/upload, RAG, caching, and LinguBreak analysis behavior.

## Non-goals

- Saving vocabulary lists, flashcards, quizzes, accounts, or spaced repetition.
- Dictionary lookup for full sentences or arbitrary Thai input.
- Replacing Gemini sentence analysis or OpenRouter embeddings.
- Adding a new UI framework, animation library, or client state dependency.
- Redesigning admin, lesson, or transcription surfaces.

## Design direction

The visual concept is a **bright learning notebook**: warm paper-like backgrounds, dark navy text, rounded white cards, soft offset shadows, and colorful grammar stickers. The interface should feel energetic without looking like a game dashboard.

The existing grammar color mapping remains, but colors become lighter surfaces with dark text and clear borders. Weapon imagery, dense uppercase labels, harsh black borders, and low-contrast slate text are removed.

## Primary flow: analyze and look up a word

### Overview

**Goal:** Understand a sentence, then inspect unfamiliar vocabulary without leaving the result.

**Trigger:** A learner submits a typed, selected, or scanned sentence.

### Flow

```text
Sentence input
  → Gemini analysis loading state
  → Thai meaning card
  → tappable English word strip
      → select word
      → dictionary loading card
      → full, partial, not-found, or error result
  → grammar chunks and explanations
  → English-order / Thai-order comparison
  → four learning steps
```

### Dictionary interaction

1. The result renders the analyzed English sentence as individual word buttons.
2. A visible hint says `แตะคำศัพท์เพื่อดูความหมาย` / `Tap a word to look it up`.
3. Selecting a word keeps the button visibly selected and opens an inline dictionary card directly below the word strip.
4. Selecting another word replaces the card content and begins the new lookup.
5. Selecting the active word again closes the card.
6. Results are cached in component memory for the current page session, so repeated taps do not repeat network requests.
7. The Listen action uses provider audio when available and browser speech synthesis otherwise.

### Dictionary states

| State | Learner experience |
| --- | --- |
| Idle | Hint is visible; no empty card is rendered. |
| Loading | Selected word remains highlighted; compact skeleton rows appear. |
| Full result | Thai meaning, pronunciation, part of speech, English definition, example, and Listen action are shown. |
| Partial result | Thai meaning or English dictionary data is shown with a quiet note that some details are unavailable. |
| Not found | Friendly bilingual message asks the learner to try another word. |
| Provider error | Bilingual retry message and Retry button are shown without losing the analysis. |

## Dictionary service architecture

### Endpoint

`GET /api/dictionary?word=<english-word>`

The route is server-side and does not call an LLM.

### Validation

- Trim and lowercase the query for lookup while preserving the display word on the client.
- Accept one English token containing letters plus an internal apostrophe or hyphen.
- Reject empty values, whitespace-separated phrases, numbers-only input, and values longer than 50 characters with HTTP 400.
- Encode all upstream query parameters with `URLSearchParams`.

### Providers

- **MyMemory Translation API:** primary English→Thai meaning. No required API key.
- **Free Dictionary API:** optional English definition, part of speech, phonetic spelling, example, and audio.

Both requests run concurrently with an eight-second timeout and `Promise.allSettled`. MyMemory is the required source for a successful Thai lookup. Free Dictionary API failure produces a valid partial response rather than failing the lookup.

### Response contract

```ts
interface DictionaryLookupResult {
  word: string;
  thaiMeaning: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definition: string | null;
  example: string | null;
  audioUrl: string | null;
  partial: boolean;
  sources: {
    thai: "MyMemory";
    english: "Free Dictionary API" | null;
  };
}
```

The route returns only the first useful learner-level meaning and definition. It does not expose raw upstream payloads.

### Caching and errors

- Successful results: `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.
- Not-found responses: HTTP 404 with a stable `{ error, code: "WORD_NOT_FOUND" }` body.
- Upstream failure: HTTP 502 with `{ error, code: "DICTIONARY_UNAVAILABLE" }`.
- Client-facing messages are bilingual and never include raw upstream errors.

## Information hierarchy

Results appear in this order:

1. **ความหมายภาษาไทย / Thai meaning** — the natural Thai translation in the strongest result card.
2. **แตะคำศัพท์ / Tap a word** — the interactive word strip and dictionary result.
3. **ประโยคนี้ทำงานอย่างไร / How this sentence works** — colored grammar chunks; clicking opens grammar explanations only.
4. **English order → Thai-friendly order** — a static, readable comparison with a directional arrow.
5. **เรียนทีละขั้น / Learn it step by step** — four expandable teaching steps.

The existing reconstruction animation is removed because it duplicates the order comparison and makes the learning path less direct.

## Component specifications

### `WordLookup`

**Purpose:** Tokenize and display the analyzed English sentence as accessible dictionary buttons.

**Data:** Original-order `AnalysisChunk[]`; it derives display tokens without changing analysis data.

**States:** idle, selected, loading, success, partial, not found, error.

**Interaction:** Each word is a native button with a minimum 44px target. Enter and Space activate it. The selected button uses `aria-pressed=true`; lookup status is announced through an `aria-live="polite"` region.

**Responsive behavior:** Words wrap naturally. The result card is full width on mobile and uses a two-column detail layout only when space allows.

### `DictionaryCard`

**Purpose:** Show concise bilingual vocabulary help without leaving the analysis.

**Content order:** word and Listen action, Thai meaning, phonetic and part of speech, English definition, example, source note.

**Readability:** Thai meaning is at least 20px with a 1.7 line height. Definitions are at least 16px with a 1.65 line height.

### `ChunkDisplay`

**Purpose:** Explain grammar chunks, not vocabulary.

**Changes:** Add the explicit label `แตะส่วนประโยคเพื่อดูไวยากรณ์`; use calmer chunk buttons and a persistent inline explanation card. Thai explanations use at least 18px text, strong contrast, and no flag emoji prefix.

### `TranslationHero`

**Purpose:** Make the natural Thai meaning the first comprehension anchor.

**Content:** Small bilingual label, large Thai translation, and the simplified English core underneath as supporting information.

### `OrderComparison`

**Purpose:** Compare English order and Thai-friendly processing without animation.

**Changes:** Replace swords and the Play/Reset reconstruction with two numbered rows connected by a clear arrow. Preserve chunk colors and original content.

### `LearningSteps`

**Purpose:** Present the existing four pedagogical steps progressively.

**Changes:** Thai title appears first and never truncates. Thai description precedes the smaller English explanation. Accordion controls expose `aria-expanded` and `aria-controls`.

### `ModelSwitcher`

Remove it from the learner page while Gemini is the only selectable analysis provider. Provider details are implementation metadata, not a learner decision.

## Design tokens

### Color roles

- Page: warm cream `#FFF8E8`.
- Surface: white `#FFFFFF`.
- Primary text: navy `#17233C`.
- Secondary text: slate `#516078`.
- Primary action: mango `#FFCA3A` with navy foreground.
- Supporting accent: teal `#2EC4B6`.
- Error: coral `#E85D5D`.
- Focus: saturated blue `#2563EB`.
- Borders: navy at 12–18% opacity, not solid black.

Grammar categories retain distinct blue, coral, teal, green, orange, and violet roles. Every category includes a text label; color is never the only indicator.

### Typography

- Heading: `Mitr`, medium and semibold weights.
- English body: `Atkinson Hyperlegible`, regular and bold.
- Thai body: `Noto Sans Thai`, regular, medium, and semibold.
- Thai translation: 24px mobile, 28px desktop, line-height 1.75.
- Thai explanations: 18px minimum, line-height 1.8.
- English body: 16px minimum, line-height 1.65.
- Utility labels: 13–14px; avoid long uppercase tracking.

### Shape and spacing

- Cards use 20–24px radii and 20–28px internal padding.
- Primary touch targets are at least 44px tall.
- Use a 4/8px spacing rhythm.
- Soft 4px offset shadows provide the notebook-sticker character without harsh contrast.

### Motion

- Limit motion to 150–220ms opacity and small translate transitions.
- Respect `prefers-reduced-motion`.
- No continuous floating, glowing, scanline, or pulse animations.

## Responsive behavior

- Mobile is the primary layout: one column, full-width controls, wrapping word buttons, and vertically stacked comparison rows.
- At 768px, translation supporting details and dictionary metadata may use two columns.
- At 1024px, the content width caps near 960px; prose remains narrower for readability.
- No essential interaction depends on hover.

## Accessibility

- Meet WCAG AA contrast for text and controls.
- Preserve semantic headings and native buttons.
- Provide visible focus indicators on every interactive element.
- Do not truncate Thai titles or explanations.
- Announce dictionary loading, result, and failure states.
- Associate accordion buttons and panels with ARIA attributes.
- Use `lang="th"` on Thai passages and `lang="en"` on English definitions where helpful.
- Keep source attribution visible but visually quiet.

## Security and privacy

- Dictionary providers are called only from the server route.
- Only the selected English word is sent upstream.
- No learner sentence, Thai explanation, Supabase credential, Gemini key, or OpenRouter key is sent to dictionary providers.
- Validate input before upstream calls and cap upstream timeouts.
- Do not render provider HTML; all values are treated as text.

## Verification

- Route checks for valid words, invalid phrases, not found, partial upstream data, and provider failure.
- Component checks for selection, cached repeat lookup, retry, keyboard activation, and audio fallback.
- Static inspection at mobile, tablet, and desktop breakpoints; browser automation or screenshots only if explicitly requested.
- Run `npm run check:routes`, `npm run check:content-inputs`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Perform a live lookup smoke test and a sentence-analysis smoke test without printing learner content or credentials.

## Acceptance criteria

- Clicking an English word visibly initiates a real non-LLM English→Thai lookup.
- A successful lookup shows a Thai meaning and source attribution.
- Dictionary failure does not remove or invalidate the sentence analysis.
- Grammar chunks clearly open grammar help, not dictionary results.
- Thai translation and explanations meet the specified size, contrast, and line-height rules.
- The result hierarchy works without horizontal scrolling at 320px width.
- Gemini sentence analysis and the existing `AnalysisResult` schema remain unchanged.
- No new UI or state-management dependency is added.
