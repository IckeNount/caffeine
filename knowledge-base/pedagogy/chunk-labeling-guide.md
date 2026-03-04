# Chunk Labeling Guide: Consistent SVO Analysis

## Purpose
This guide ensures consistent labeling of sentence chunks across all analyses. Every word in the input sentence must belong to exactly one chunk with one of these labels.

## Chunk Types and Rules

### 1. `subject` (ประธาน) — Color: Blue
**Definition**: The entity performing the action or being described.

**Rules**:
- Include articles and determiners: "**The old man**" = one subject chunk, not "The" + "old" + "man"
- Include possessives: "**My father's friend**" = one subject chunk
- DO NOT include relative clauses modifying the subject — those get their own chunk
- In passive voice, the subject is still the grammatical subject: "**The cake** was eaten"

**Examples**:
- "**The student** passed the exam" → subject: "The student"
- "**Everyone in the class** agreed" → subject: "Everyone in the class"
- "**My brother who lives in Bangkok**" → subject: "My brother" + separate relative_clause: "who lives in Bangkok"

### 2. `verb` (กริยา) — Color: Red
**Definition**: The main action or state of being.

**Rules**:
- Include auxiliaries: "**has been studying**" = one verb chunk
- Include negation: "**did not understand**" = one verb chunk
- Include passive markers: "**was given**" = one verb chunk
- Modal + verb = one chunk: "**should have been completed**"
- DO NOT include the object — split at the boundary

**Examples**:
- "She **speaks** English" → verb: "speaks"
- "They **have been waiting**" → verb: "have been waiting"
- "The exam **was given** by the professor" → verb: "was given"

### 3. `object` (กรรม) — Color: Sky Blue
**Definition**: The entity receiving the action.

**Rules**:
- Include articles and determiners: "**the exam**" = one object chunk
- Include direct AND indirect objects as separate chunks if both present
- DO NOT include prepositional phrases that modify the object — those get their own chunk

**Examples**:
- "She reads **books**" → object: "books"
- "He gave **his friend** **a gift**" → two objects: "his friend" (indirect) + "a gift" (direct)
- "I saw **the movie that won the award**" → object: "the movie" + relative_clause: "that won the award"

### 4. `relative_clause` (อนุประโยคขยาย / ที่) — Color: Green
**Definition**: A clause beginning with who/which/that/whose/whom/where that modifies a noun.

**Rules**:
- Start with the relative pronoun
- Include everything until the next main clause boundary
- ALWAYS mention ที่ in the Thai explanation
- If "that" is omitted in English ("the book I read"), still label as relative_clause

**Examples**:
- "the student **who studied hard**" → relative_clause
- "the book **that I borrowed from the library**" → relative_clause
- "the city **where I was born**" → relative_clause

### 5. `prepositional` (บุพบท) — Color: Amber
**Definition**: A phrase starting with a preposition (in, on, at, by, with, from, to, for, about, etc.).

**Rules**:
- Include the preposition + its entire object: "**from the library**"
- If the prepositional phrase contains a relative clause, split them
- "by + agent" in passive = prepositional chunk

**Examples**:
- "**in the morning**" → prepositional
- "**by the professor**" → prepositional
- "**with her friends**" → prepositional
- "**from the library which was built in 1920**" → "from the library" (prepositional) + "which was built in 1920" (relative_clause)

### 6. `modifier` (ตัวขยาย) — Color: Purple
**Definition**: Any word/phrase that modifies but doesn't fit other categories. Includes adjectives, adverbs, participial phrases, and subordinate clauses.

**Rules**:
- Adjectives that are separated from their noun: labeled as modifier
- Adverbs: "**quickly**", "**very well**"
- Subordinate clauses: "**because it was raining**", "**if you study hard**"
- Infinitive phrases: "**to pass the exam**"
- Participial phrases: "**written by Shakespeare**", "**running quickly**"

**Examples**:
- "**very**" in "a very tall building" → modifier (or include with subject)
- "**because he was tired**" → modifier
- "**to improve her English**" → modifier

## Decision Flowchart

```
Is it performing the action? → SUBJECT
Is it the action itself? → VERB  
Is it receiving the action? → OBJECT
Does it start with who/which/that/where? → RELATIVE_CLAUSE
Does it start with a preposition? → PREPOSITIONAL
Everything else (adjective/adverb/clause) → MODIFIER
```

## Thai Reordering Rules
When creating `thai_reordered_chunks`:
1. Subject stays first
2. Move modifiers of the subject to AFTER the subject
3. Verb comes next
4. Object follows verb
5. Move modifiers of the object to AFTER the object
6. Prepositional phrases go at the end (time, place, manner)
7. Relative clauses stay attached to their noun (using ที่)
