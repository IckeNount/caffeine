# Young Learner UI and Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a readable, mobile-first learner interface with real non-LLM English→Thai word lookup.

**Architecture:** Add a server-side dictionary boundary that combines MyMemory Thai meanings with optional Free Dictionary API details, then expose it through a small client hook and accessible word-lookup components. Refactor the existing learner page around a light notebook visual system and a translation-first result hierarchy without changing `AnalysisResult`, Gemini analysis, OpenRouter embeddings, RAG, or caching.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Zod, Lucide React, MyMemory Translation API, Free Dictionary API.

## Global Constraints

- Do not add a UI framework, animation library, state-management dependency, or dictionary API key.
- Dictionary providers are server-only and must never receive the learner's full sentence.
- Preserve the existing `AnalysisResult` schema and `/api/analyze` contract.
- Thai translation uses at least 24px text and Thai explanations use at least 18px text with high contrast.
- All word buttons use native buttons, visible focus, and a minimum 44px touch target.
- No browser automation or screenshots unless the user explicitly requests them.
- Preserve the user's untracked `CAFFEINE_DEMO_CORE_REFACTOR_CODEX.md` file.

## File structure

- Create `src/features/dictionary/lib/schema.ts`: public dictionary response type and word validation.
- Create `src/features/dictionary/lib/lookup.ts`: server-side provider orchestration and response normalization.
- Create `src/app/api/dictionary/route.ts`: validated HTTP boundary and cache headers.
- Create `src/features/dictionary/hooks/useDictionaryLookup.ts`: selection, request, retry, and page-session cache state.
- Create `src/features/dictionary/components/DictionaryCard.tsx`: vocabulary states and readable result UI.
- Create `src/features/dictionary/components/WordLookup.tsx`: sentence token buttons and accessibility wiring.
- Create `src/features/dictionary/index.ts`: feature exports.
- Create `src/features/lingubreak/components/TranslationHero.tsx`: translation-first result card.
- Create `src/features/lingubreak/components/OrderComparison.tsx`: static English-to-Thai order comparison.
- Create `scripts/check-dictionary.ts`: deterministic service checks with stubbed fetch responses.
- Create `scripts/check-learner-ui.ts`: focused static contract checks.
- Modify `src/app/(student)/page.tsx`: new hierarchy and removal of learner-facing model selection.
- Modify `src/features/lingubreak/components/ChunkDisplay.tsx`: explicit grammar interaction and readable Thai.
- Modify `src/features/lingubreak/components/StepAccordion.tsx`: Thai-first accessible steps.
- Modify `src/features/lingubreak/components/SentenceInput.tsx`: notebook-styled bilingual input flow.
- Modify `src/features/daily-reading/components/DailyReadingPanel.tsx`, `src/features/ocr/components/OcrInputPanel.tsx`, and `src/features/lingubreak/components/SentencePicker.tsx`: align input-source panels.
- Modify `src/app/globals.css`: light design tokens, typography, focus, reduced motion, and reusable surfaces.
- Modify `src/app/layout.tsx`: remove the forced dark class and set language-safe body styling.
- Modify `infra/gateway-routes.yaml`: register `/api/dictionary`.
- Modify `package.json`: add focused check scripts.
- Modify `README.md`: document Gemini analysis, dictionary providers, and learner flow.

---

### Task 1: Server-side dictionary lookup

**Files:**
- Create: `src/features/dictionary/lib/schema.ts`
- Create: `src/features/dictionary/lib/lookup.ts`
- Create: `src/app/api/dictionary/route.ts`
- Create: `scripts/check-dictionary.ts`
- Modify: `infra/gateway-routes.yaml`
- Modify: `package.json`

**Interfaces:**
- Consumes: global `fetch`, MyMemory `GET /get`, Free Dictionary API `GET /api/v2/entries/en/:word`.
- Produces: `normalizeDictionaryWord(value: unknown): string | null`, `lookupDictionary(word: string, fetchImpl?: typeof fetch): Promise<DictionaryLookupResult>`, and `GET /api/dictionary?word=`.

- [ ] **Step 1: Write the deterministic failing service check**

Create `scripts/check-dictionary.ts` with stubbed `Response` objects. Assert that `student` normalizes, `two words` is rejected, a full provider response produces Thai meaning plus definition, and a failed English dictionary response produces `partial: true` while preserving the Thai result.

```ts
import assert from "node:assert/strict";
import { lookupDictionary } from "../src/features/dictionary/lib/lookup";
import { normalizeDictionaryWord } from "../src/features/dictionary/lib/schema";

assert.equal(normalizeDictionaryWord(" Student "), "student");
assert.equal(normalizeDictionaryWord("two words"), null);

const fullFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url.includes("mymemory")) {
    return Response.json({
      responseStatus: 200,
      responseData: { translatedText: "นักเรียน" },
    });
  }
  return Response.json([{
    word: "student",
    phonetic: "/ˈstjuːdnt/",
    phonetics: [{ audio: "https://example.com/student.mp3" }],
    meanings: [{
      partOfSpeech: "noun",
      definitions: [{
        definition: "A person who is learning at a school.",
        example: "The student reads every day.",
      }],
    }],
  }]);
};

const full = await lookupDictionary("student", fullFetch);
assert.equal(full.thaiMeaning, "นักเรียน");
assert.equal(full.partOfSpeech, "noun");
assert.equal(full.partial, false);

const partial = await lookupDictionary("student", async (input) =>
  String(input).includes("mymemory")
    ? Response.json({ responseStatus: 200, responseData: { translatedText: "นักเรียน" } })
    : new Response("unavailable", { status: 522 }),
);
assert.equal(partial.thaiMeaning, "นักเรียน");
assert.equal(partial.partial, true);
console.log("check:dictionary OK");
```

- [ ] **Step 2: Run the new check and verify it fails**

Run: `npx tsx scripts/check-dictionary.ts`  
Expected: FAIL because the dictionary modules do not exist.

- [ ] **Step 3: Implement validation, provider normalization, and the route**

Use this public response contract in `schema.ts`:

```ts
import { z } from "zod";

export const DictionaryLookupResultSchema = z.object({
  word: z.string(),
  thaiMeaning: z.string(),
  phonetic: z.string().nullable(),
  partOfSpeech: z.string().nullable(),
  definition: z.string().nullable(),
  example: z.string().nullable(),
  audioUrl: z.string().url().nullable(),
  partial: z.boolean(),
  sources: z.object({
    thai: z.literal("MyMemory"),
    english: z.literal("Free Dictionary API").nullable(),
  }),
});
export type DictionaryLookupResult = z.infer<typeof DictionaryLookupResultSchema>;

const WORD_PATTERN = /^[a-z]+(?:['’-][a-z]+)*$/i;
export function normalizeDictionaryWord(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length <= 50 && WORD_PATTERN.test(normalized)
    ? normalized
    : null;
}
```

In `lookup.ts`, call both providers with `AbortSignal.timeout(8_000)`, parse only fields in the public contract, require a non-empty MyMemory Thai result, and treat Free Dictionary API failure as partial success. Throw a `DictionaryLookupError` with code `WORD_NOT_FOUND` or `DICTIONARY_UNAVAILABLE`; never return raw provider payloads.

In `route.ts`, validate `request.nextUrl.searchParams.get("word")`, map invalid input to HTTP 400, not found to 404, provider failure to 502, and successful results to:

```ts
return NextResponse.json(result, {
  headers: {
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  },
});
```

- [ ] **Step 4: Register and verify the route**

Add `- path: /api/dictionary` to `infra/gateway-routes.yaml` and `"check:dictionary": "tsx scripts/check-dictionary.ts"` to `package.json`.

Run: `npm run check:dictionary && npm run check:routes`  
Expected: both commands exit 0 and route discovery includes `/api/dictionary`.

- [ ] **Step 5: Commit the server boundary**

```bash
git add src/features/dictionary/lib src/app/api/dictionary scripts/check-dictionary.ts infra/gateway-routes.yaml package.json
git commit -m "feat: add free English Thai dictionary lookup"
```

### Task 2: Accessible word lookup interaction

**Files:**
- Create: `src/features/dictionary/hooks/useDictionaryLookup.ts`
- Create: `src/features/dictionary/components/DictionaryCard.tsx`
- Create: `src/features/dictionary/components/WordLookup.tsx`
- Create: `src/features/dictionary/index.ts`
- Create: `scripts/check-learner-ui.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `DictionaryLookupResult`, `AnalysisChunk[]`, and `GET /api/dictionary?word=`.
- Produces: `<WordLookup chunks={result.chunks} />` with session caching and accessible lookup states.

- [ ] **Step 1: Write the focused failing UI contract check**

Create `scripts/check-learner-ui.ts` to read the new files and assert that word buttons expose `aria-pressed`, status uses `aria-live`, Thai text uses `lang="th"`, and the page imports `WordLookup` but no longer imports `ModelSwitcher` or `ReconstructionView`.

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const wordLookup = read("src/features/dictionary/components/WordLookup.tsx");
const card = read("src/features/dictionary/components/DictionaryCard.tsx");
const page = read("src/app/(student)/page.tsx");

assert.match(wordLookup, /aria-pressed/);
assert.match(wordLookup, /aria-live="polite"/);
assert.match(card, /lang="th"/);
assert.match(page, /WordLookup/);
assert.doesNotMatch(page, /ModelSwitcher/);
assert.doesNotMatch(page, /ReconstructionView/);
console.log("check:learner-ui OK");
```

- [ ] **Step 2: Run the UI contract check and verify it fails**

Run: `npx tsx scripts/check-learner-ui.ts`  
Expected: FAIL because the new components do not exist.

- [ ] **Step 3: Implement lookup state and page-session caching**

`useDictionaryLookup.ts` must expose this stable interface:

```ts
export type DictionaryStatus = "idle" | "loading" | "success" | "not-found" | "error";
export interface DictionaryState {
  selectedWord: string | null;
  status: DictionaryStatus;
  result: DictionaryLookupResult | null;
  error: string | null;
  selectWord: (word: string) => void;
  retry: () => void;
}
```

Use a `Map<string, DictionaryLookupResult>` in a ref. Abort the previous request when selection changes, ignore stale responses, close when the active word is selected again, and map HTTP 404 to the not-found state.

- [ ] **Step 4: Implement `DictionaryCard` and `WordLookup`**

Tokenize chunk text with `/[A-Za-z]+(?:['’-][A-Za-z]+)*/g`, retaining repeated words in sentence order. Render each token as:

```tsx
<button
  type="button"
  aria-pressed={selectedWord?.toLowerCase() === word.toLowerCase()}
  onClick={() => selectWord(word)}
  className="word-chip"
>
  {word}
</button>
```

Place the status card in `<div aria-live="polite">`. `DictionaryCard` shows Thai meaning first, then phonetic/POS, English definition, example, source attribution, and a Retry action. Listen uses `new Audio(audioUrl).play()` when available and `speechSynthesis.speak(new SpeechSynthesisUtterance(word))` otherwise.

- [ ] **Step 5: Export and verify the dictionary UI**

Export `WordLookup` from `src/features/dictionary/index.ts`, add `"check:learner-ui": "tsx scripts/check-learner-ui.ts"`, then run:

`npm run check:learner-ui && npm run typecheck && npm run lint -- src/features/dictionary scripts/check-learner-ui.ts`

Expected: all commands exit 0.

- [ ] **Step 6: Commit the interaction**

```bash
git add src/features/dictionary scripts/check-learner-ui.ts package.json
git commit -m "feat: add accessible vocabulary lookup interaction"
```

### Task 3: Light learner visual foundation and input flow

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(student)/page.tsx`
- Modify: `src/features/lingubreak/components/SentenceInput.tsx`
- Modify: `src/features/daily-reading/components/DailyReadingPanel.tsx`
- Modify: `src/features/ocr/components/OcrInputPanel.tsx`
- Modify: `src/features/lingubreak/components/SentencePicker.tsx`

**Interfaces:**
- Consumes: existing input callbacks and result state without signature changes.
- Produces: the warm notebook shell and responsive bilingual input experience.

- [ ] **Step 1: Replace the dark visual tokens**

Import `Mitr`, `Atkinson Hyperlegible`, and `Noto Sans Thai`. Define the approved cream, white, navy, slate, mango, teal, coral, blue, and translucent-border variables. Replace brutal utilities with `.learner-card`, `.learner-button`, `.learner-input`, `.word-chip`, `.thai-reading`, and `.focus-ring` utilities. Add:

```css
:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}

.thai-reading {
  font-family: var(--font-thai);
  font-size: 1.125rem;
  line-height: 1.8;
  font-weight: 500;
  color: var(--text-primary);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Simplify the learner shell**

Remove `className="dark"` from `layout.tsx`. In the learner page, remove `ModelSwitcher` state and rendering, use a compact bilingual header, reduce the English marketing hero, and keep a maximum content width near 960px.

- [ ] **Step 3: Restyle input and content-source panels**

Keep all callbacks intact. Use bilingual labels, 44px controls, white surfaces, readable 16px English text, and visible selected/open states. Replace inline hover mutations with CSS classes so keyboard users receive equivalent feedback.

- [ ] **Step 4: Run focused checks**

Run: `npm run check:content-inputs && npm run typecheck && npm run lint`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit the visual foundation**

```bash
git add src/app/globals.css src/app/layout.tsx 'src/app/(student)/page.tsx' src/features/lingubreak/components/SentenceInput.tsx src/features/daily-reading/components/DailyReadingPanel.tsx src/features/ocr/components/OcrInputPanel.tsx src/features/lingubreak/components/SentencePicker.tsx
git commit -m "refactor: introduce young learner visual foundation"
```

### Task 4: Translation-first result hierarchy

**Files:**
- Create: `src/features/lingubreak/components/TranslationHero.tsx`
- Create: `src/features/lingubreak/components/OrderComparison.tsx`
- Modify: `src/features/lingubreak/components/ChunkDisplay.tsx`
- Modify: `src/features/lingubreak/components/StepAccordion.tsx`
- Modify: `src/app/(student)/page.tsx`
- Modify: `scripts/check-learner-ui.ts`

**Interfaces:**
- Consumes: unchanged `AnalysisResult` fields.
- Produces: Thai meaning → word lookup → grammar → order comparison → learning steps.

- [ ] **Step 1: Build the translation hero**

`TranslationHero` accepts `thaiTranslation: string` and `simplifiedEnglish: string`. Thai renders first in a `<p lang="th">` at 24px mobile/28px desktop; the English core is supporting content with a bilingual label.

- [ ] **Step 2: Build the static order comparison**

`OrderComparison` accepts `englishChunks` and `thaiChunks`. Render two numbered rows with the existing category labels and a downward arrow between them. Do not include animation, swords, Play, or Reset controls.

- [ ] **Step 3: Rewrite grammar chunks and learning steps**

`ChunkDisplay` adds `แตะส่วนประโยคเพื่อดูไวยากรณ์`, uses `aria-pressed`, and renders selected Thai grammar help with `lang="th"` and `.thai-reading`. `StepAccordion` renders Thai title and description before their English equivalents, never uses `truncate`, and connects each button/panel with `aria-expanded`, `aria-controls`, and a stable panel id.

- [ ] **Step 4: Integrate the result hierarchy**

In the result block render exactly:

```tsx
<TranslationHero
  thaiTranslation={result.thai_translation}
  simplifiedEnglish={result.simplified_english}
/>
<WordLookup chunks={result.chunks} />
<ChunkDisplay chunks={result.chunks} />
<OrderComparison
  englishChunks={result.chunks}
  thaiChunks={result.thai_reordered_chunks}
/>
<StepAccordion steps={result.pedagogical_steps} />
```

Remove imports and rendering for `ComparisonView` and `ReconstructionView`; leave their source files untouched for a later cleanup decision.

- [ ] **Step 5: Expand and run the UI contract check**

Add assertions for `TranslationHero`, `OrderComparison`, the Thai-first order in `StepAccordion`, absence of `truncate`, and absence of swords/Play/Reset in the learner page.

Run: `npm run check:learner-ui && npm run typecheck && npm run lint`  
Expected: all commands exit 0.

- [ ] **Step 6: Commit the result experience**

```bash
git add src/features/lingubreak/components/TranslationHero.tsx src/features/lingubreak/components/OrderComparison.tsx src/features/lingubreak/components/ChunkDisplay.tsx src/features/lingubreak/components/StepAccordion.tsx 'src/app/(student)/page.tsx' scripts/check-learner-ui.ts
git commit -m "refactor: make learner results Thai first"
```

### Task 5: Documentation and end-to-end verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: all completed dictionary and UI tasks.
- Produces: verified build and accurate setup documentation.

- [ ] **Step 1: Update documentation**

Document the `/api/dictionary` flow, MyMemory and Free Dictionary API attribution, no-key/no-LLM behavior, partial-result fallback, and `npm run check:dictionary` / `npm run check:learner-ui` scripts.

- [ ] **Step 2: Run focused and project-wide checks**

Run:

```bash
npm run check:dictionary
npm run check:learner-ui
npm run check:routes
npm run check:content-inputs
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 3: Run live smoke checks**

With localhost running, call `/api/dictionary?word=student` and report only status, response keys, source names, and presence of a Thai meaning. Submit one existing example sentence to `/api/analyze` and report only status plus schema-shape counts. Do not print learner content or credentials.

- [ ] **Step 4: Review the final diff and commit**

Run `git diff --check` and confirm `CAFFEINE_DEMO_CORE_REFACTOR_CODEX.md` remains untouched.

```bash
git add README.md
git commit -m "docs: document learner dictionary experience"
```
