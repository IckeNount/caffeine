# Reported Speech: Tense Backshifting in a Tenseless Language

## Academic Overview
Reported (indirect) speech in English involves a systematic set of syntactic transformations when converting direct quotations into embedded clauses. The most significant of these is tense backshifting — the obligatory shifting of verb tenses one step into the past when the reporting verb is in past tense (e.g., "I am happy" → She said she **was** happy). Additional changes include pronoun shifts, demonstrative shifts (this → that), and time/place adverbial shifts (here → there, now → then).

Thai reported speech is structurally transparent: the reporting verb (บอกว่า/พูดว่า = said that) is followed by the original statement with virtually no grammatical changes. There is no tense backshifting because Thai verbs do not inflect for tense. Pronouns may shift based on context, but this is pragmatic, not grammatical.

This makes English reported speech particularly opaque for Thai learners (CEFR B1–C1). The concept that a past-tense reporting verb triggers automatic tense changes in the embedded clause has no analogue in Thai. Students must learn a transformation rule that feels arbitrary: why should "I **am** happy" become "she **was** happy" just because someone said it yesterday?

CEFR suitability: Basic reported statements (B1), Reported questions (B2), Reported commands and modal backshifting (B2–C1).

## English vs. Thai: Key Differences

### Thai Reported Speech (No Transformations)
Thai simply inserts ว่า (wâa = that) after the reporting verb and quotes the content as-is:

- Direct: เขาพูดว่า "ฉันมีความสุข" (He said "I am happy")
- Indirect: เขาพูดว่า**เขามีความสุข** (He said that he happy)
- No tense change, no time adverb shift, only pronoun ฉัน→เขา if needed

### Why This Is Difficult for Thai Students
1. **No tense backshift in Thai**: Verbs never change form, so "said + was" feels like an error
2. **Pronoun shifting is pragmatic in Thai**: Thai may keep the original pronoun if context is clear
3. **Modal backshifting is invisible in Thai**: will→would, can→could have no Thai equivalent
4. **Reported questions require REMOVING inversion**: "Where do you live?" → He asked where I **lived** — both removing "do" and backshifting are confusing

## Pattern Mapping

| Change Type | Direct Speech | Reported Speech | Thai Approach | Common Error |
|-------------|--------------|-----------------|---------------|--------------|
| Present → Past | "I **am** tired" | She said she **was** tired | No change: เธอบอกว่าเธอเหนื่อย | "She said she is tired" |
| Past → Past Perfect | "I **went** home" | He said he **had gone** home | No change: เขาบอกว่าเขากลับบ้าน | "He said he went home" |
| Will → Would | "I **will** help" | She said she **would** help | No change: เธอบอกว่าเธอจะช่วย | "She said she will help" |
| Can → Could | "I **can** swim" | He said he **could** swim | No change: เขาบอกว่าเขาว่ายน้ำได้ | "He said he can swim" |
| This → That | "**this** book" | **that** book | No change: หนังสือเล่มนี้/นั้น | "He said this book" |
| Now → Then | "I'm reading **now**" | She said she was reading **then** | No change: ตอนนี้/ตอนนั้น | "She said now" |
| Today → That day | "I'll go **today**" | He said he would go **that day** | No change: วันนี้/วันนั้น | "He said today" |

## Chunking Rules for LinguBreak

### Reported Speech in Chunks
When analyzing a sentence with reported speech:

1. **Reporting clause**: "He said / She told me / They asked" = `subject` + `verb`
   - "**He** **said** that she was tired" → subject: "He" + verb: "said"

2. **"that" connector**: Include "that" with the reported clause, or treat as a connector leading to the reported content
   - "He said **that she was tired**" → The "that"-clause contains its own internal SVO

3. **Reported content**: Analyze the embedded clause with normal SVO labeling
   - Inside "that she was tired": subject: "she" + verb: "was" + modifier: "tired"
   - The entire "that she was tired" can also be labeled as one `object` chunk (it's what was said)

4. **Reported questions**: Label the entire embedded question as `object`
   - "She asked **where I lived**" → verb: "asked" + object: "where I lived"

### Critical Rule
In reported speech, the embedded clause uses STATEMENT word order, NOT question order. "She asked where I lived" — NOT "She asked where did I live." Flag this in `thai_explanation`.

## Thai Logic Reconstruction

### Reordering Rules for Reported Speech
Thai reported speech follows the same SVO order as English, making this one of the easier grammar patterns to reconstruct:

1. **Reported statements**: Subject + reporting verb + ว่า + reported content
   - "She said that she was tired" → เธอ + บอกว่า + เธอเหนื่อย
   - Note: Drop the tense backshift in Thai — use present-form verb

2. **Reported questions**: Subject + reporting verb + ว่า + question content (SVO order)
   - "He asked where I lived" → เขา + ถามว่า + ฉันอยู่ที่ไหน
   - Note: Thai restores the question word to in-situ position

3. **Reported commands**: Subject + reporting verb + ให้ (hâi = to / for) + action
   - "She told me to study harder" → เธอ + บอกให้ฉัน + เรียนให้หนักขึ้น

### Key Point
The Thai reconstruction should show that reported speech in Thai is essentially "said that + original sentence unchanged." This helps students understand that English backshifting is a grammatical rule, not a meaning change.

## Common L1 Interference Errors (Thai Students)

1. **No tense backshifting**: "She said she **is** tired" → "She said she **was** tired"
   - *Cause*: Thai เธอบอกว่าเธอเหนื่อย uses present-form verb. No shift occurs.

2. **Keeping question word order in reported questions**: "He asked **where did I live**" → "He asked **where I lived**"
   - *Cause*: Thai reported questions keep the same structure as direct questions.

3. **Omitting "that"**: "He said **∅** he would come" — This is actually often acceptable in English! But Thai students do it for the wrong reason (Thai ว่า is also sometimes dropped).

4. **No modal backshifting**: "She said she **will** help" → "She said she **would** help"
   - *Cause*: Thai จะ (will) never changes form. เธอบอกว่าเธอจะช่วย.

5. **Mixing direct and indirect speech**: "He said that **I am** happy and that **he** was going" → inconsistent shifting
   - *Cause*: Students partially apply the backshifting rule, especially in longer sentences.

## Golden Examples

1. **Basic reported statement**:
   - "The teacher said that the exam **would be** difficult."
   - Core SVO: "The teacher said that the exam would be difficult"
   - Thai: ครูบอกว่าข้อสอบจะยาก

2. **Reported question**:
   - "My mother asked me **where I had been** all afternoon."
   - Core SVO: "My mother asked me where I had been"
   - Thai: แม่ถามฉันว่าฉันไปไหนมาทั้งบ่าย

3. **Reported command**:
   - "The doctor told him **to stop eating** junk food immediately."
   - Core SVO: "The doctor told him to stop eating junk food"
   - Thai: หมอบอกให้เขาหยุดกินอาหารขยะทันที

4. **Complex reported speech with multiple shifts**:
   - "She told me that she **had finished** the project the day before and that she **would submit** it the following week."
   - Core SVO: "She told me that she had finished the project and would submit it"
   - Thai: เธอบอกฉันว่าเธอทำโปรเจกต์เสร็จแล้วเมื่อวันก่อน และจะส่งสัปดาห์ถัดไป
