# AI Engine — Context Awareness Brainstorm

This doc is a brainstorm on **context awareness** for our AI engine, especially for **bulk translation** and **lesson/chapter-scale understanding** in a language learning platform.

---

## Why context awareness matters

In language learning, the “best” output is rarely sentence-local. We often need:

- **Coreference resolution**: who “you/he/she/they/it” refers to
- **Speaker tracking**: who said what, and who is being addressed
- **Entity consistency**: names, roles, genders, honorifics, formal vs informal address
- **Discourse coherence**: tense, topic continuity, implied intent, politeness
- **Pedagogy**: preserving teachable patterns (e.g., keeping ambiguity when it’s instructional)

---

## Example: coreference (“you”)

Dialogue:

> A: Hey Manny I heard you're trying out for student government, is that true?  
> B: Hey Sarah, yeah, I'm trying for student body president.  
> A: Wow that's exciting. Jacob is the current student body president, isn’t he?  
> B: Yeah, but he is graduating this year.  
> A: I'm sure you'll win.  
> B: Thanks Sarah, I hope so.

Question: who does “you” refer to in “I’m sure you’ll win”?

- **Most likely referent**: **Manny (speaker B)**, because:
  - A directly addresses Manny (“you’re trying…”)
  - Manny confirms his candidacy (“I’m trying for president”)
  - “You’ll win” naturally targets the candidate being discussed
- **Why it can still go wrong**: a naïve translator or chunked pipeline might:
  - lose speaker labels,
  - process each line independently,
  - or over-weight the most recently mentioned named entity (“Jacob”).

Takeaway: **context awareness is not optional** if we do bulk operations on dialogue-like content.

---

## What “context” should the engine know?

At minimum, for lesson/chapter-scale operations:

- **Conversation structure**
  - speaker ids (A/B, or actual names)
  - turn order and adjacency pairs (question → answer, offer → acceptance, etc.)
- **Entity memory**
  - canonical entities (Manny, Sarah, Jacob)
  - attributes: role (“current president”), status (“graduating”), salience score
- **Referent resolution outputs**
  - token spans: “you” → Manny; “he” → Jacob
  - confidence + alternatives when ambiguous
- **Task intent**
  - are we translating for “naturalness”, for “literal learning value”, or for “grammar spotlight”?
- **Lesson constraints**
  - target level (A2/B1/etc.)
  - vocabulary list / banned words / desired grammar forms
- **Local user context (optional)**
  - learner’s L1, known vocabulary, current mistakes, goals

---

## Where context awareness shows up in our product

- **Bulk translation**
  - translating a whole lesson/chapter, including dialogue, instructions, examples, quizzes
  - requires cross-sentence consistency (pronouns, tone, terminology)
- **Exercise generation**
  - cloze deletions that should avoid breaking referents
  - distractors that should remain plausible but not misleading
- **Answer evaluation / feedback**
  - detecting when a learner chose the wrong referent (pronoun error)
- **Lesson narration**
  - summaries, hints, “what’s happening in this scene”

---

## Approaches (from cheapest → richest)

### 1) Deterministic / heuristic context (fastest, cheapest)

Goal: get “good enough” context awareness for dialogue-heavy text **without** paying large token costs.

Ideas:

- **Preserve structure** as data, not as text:
  - store dialogue turns as `{speaker, text}` objects
  - keep a stable speaker map (A=Sarah, B=Manny)
- **Simple salience model**:
  - maintain “active speaker” and “addressee”
  - maintain “recent entities” ranked by mention type (pronoun < name < title + name)
- **Rule-based coreference hints** (language-dependent):
  - in direct address, “you” usually points to the current addressee
  - “he/she” rarely points to the addressee unless explicitly switched

Pros:
- very fast, predictable, cheap

Cons:
- brittle on complex narratives, sarcasm, multi-party chat, long gaps

When to use:
- as a **first-pass** to reduce the workload of expensive steps

---

### 2) Lightweight “context pack” injection (cheap, LLM-friendly)

Instead of feeding the whole chapter, feed:

- the **current chunk**
- plus a compact **context pack** (structured summary) like:
  - speakers + roles
  - entity table
  - last \(N\) turns
  - resolved pronoun map (if available)

This keeps tokens down and reduces hallucinations.

---

### 3) RAG (retrieve relevant context on demand)

RAG can help, but we should be precise about *what* we retrieve.

Good RAG targets for language learning:
- **Lesson-owned context**: earlier turns, character bios, glossary, style guide, level constraints
- **Knowledge base**: grammar notes, canonical translations, terminology rules

Less useful / riskier:
- retrieving arbitrary “world knowledge” for basic dialogues (can introduce noise)

Key design: retrieval units should respect structure:
- dialogue turns, scenes, exercises, glossary entries
- not arbitrary paragraph chunks

Pros:
- scalable to long lessons without long-context prompts
- can keep token usage stable

Cons:
- retrieval mistakes can be worse than “no retrieval”
- requires indexing strategy + evaluation

---

### 4) Long-context “just include the chapter” (simplest, can be expensive)

Pros:
- easiest to implement
- often best quality if the model can attend reliably

Cons:
- token cost + latency
- still not guaranteed to preserve consistency unless prompted correctly

When to use:
- premium/high-stakes operations (final publish, teacher mode)

---

### 5) Hybrid pipeline (recommended direction)

Combine:

- **structured preprocessing** (turn parsing, speaker mapping, entity extraction)
- **cheap heuristics** (salience, addressee)
- optional **LLM coref pass** (only when needed)
- **context pack** + **targeted retrieval** for translation/generation

The engine should escalate only when confidence is low.

---

## “Speed + less token” strategy (practical)

For bulk translation of lessons/chapters:

- **Segment by structure**:
  - keep each dialogue as a unit (scene)
  - keep instructions and exercises separate
- **Compute a context pack once per unit**:
  - speaker map + entity table
  - stable term glossary for that unit
- **Translate per turn with shared constraints**:
  - pass the context pack every time (small)
  - pass only last 1–3 turns as immediate context
- **Use caching aggressively**:
  - cache context packs by content hash
  - cache term glossary decisions (name transliterations, honorifics)
- **Escalate only on ambiguity**:
  - if pronoun resolution confidence < threshold, run a targeted coref call

This aims for:
- lower latency
- lower tokens
- consistency across the whole dialogue

---

## How do we know the engine is “intelligent enough”?

We need an evaluation harness focused on context, not just fluency.

### Metrics / tests we should build

- **Coreference accuracy** (dialogue + narrative)
  - test cases like the “you” example, with gold labels
- **Consistency checks** across a unit
  - same entity translated consistently (names, titles)
  - stable formality level (tu/vous, honorifics, etc.)
- **Discourse coherence**
  - tense continuity, topic continuity, correct speaker addressing
- **Pedagogical constraints**
  - target vocabulary compliance
  - grammar feature inclusion/exclusion

### “Unit tests” for content

Create a small set of canonical lesson scenes:
- 20–50 dialogues of varying complexity
- each with expected referents + translation constraints

Then run:
- heuristic-only
- context-pack-only
- RAG hybrid
- long-context

Compare quality vs cost.

---

## Open questions (to decide)

## Decisions (locked in)

- **Product stance**: we optimize for **best for learning** (not necessarily the most natural).
- **Ambiguity handling**: when source text is ambiguous, we **do not auto-resolve**. We flag it and resolve **manually** in authoring.
- **Data model**: lesson content (especially scenes/dialogue) is stored as **first-class JSON** (markdown can be derived for display, not the source of truth).
- **Privacy**: **no learner context is allowed** to influence AI outputs (no personalization, no per-user memory in generation).
- **Caching**: **TBD** (decide later).

## Remaining open questions

- **Authoring workflow**: where/how do humans resolve ambiguity (UI, schema fields, validation rules)?
- **Pedagogy knobs**: which “learning-first” constraints are globally enforced (literalness, vocabulary caps, grammar targets)?
- **RAG scope**: should retrieval be limited strictly to lesson-owned data + internal style/glossary, or also include curated grammar KB?
- **Observability**: what non-user-specific logs/metrics do we keep to improve quality while respecting privacy?

---

## Proposed next step

Implement a prototype pipeline for dialogue translation (learning-first, privacy-safe, JSON-first):

- **Define JSON schema** for a “scene”:
  - turns: `{speakerId, text}`
  - speakers: `{speakerId, displayName, role?}`
  - entities: canonical entity list + optional attributes
  - author annotations: `disambiguations[]` (e.g., pronoun → referent) and `notes[]`
  - pedagogy constraints: target level, tone, glossary, literalness mode
- **Build a context pack** from the JSON (compact, model-friendly).
- **Translate per turn** using:
  - the context pack
  - a small sliding window of recent turns
  - pedagogy constraints (learning-first)
- **Detect ambiguity** (coref/role/tense/term uncertainty) and:
  - emit a structured “needs manual resolution” report for authoring
  - do **not** guess when confidence is low
- **Evaluate** on curated JSON scenes with gold referents and consistency checks.

Then evaluate on a curated set of lesson dialogues with gold referents and consistency checks.
