// ── Free Dictionary API response types ──────────────────────────────

export interface DictionaryEntry {
  word: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  license?: License;
  sourceUrls?: string[];
}

export interface Phonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: License;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface Definition {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
}

export interface License {
  name: string;
  url: string;
}

export interface DictionaryError {
  title: string;
  message: string;
  resolution: string;
}

// ── Thai Translation types ──────────────────────────────────────────

export interface ThaiTranslation {
  /** The Thai translation of the word itself */
  wordThai: string;
  /** Thai translations per meaning/part-of-speech */
  meanings: ThaiMeaningTranslation[];
}

export interface ThaiMeaningTranslation {
  /** e.g. "คำนาม", "คำกริยา" */
  partOfSpeechThai: string;
  /** Thai translation for each definition, matching the order of the English definitions */
  definitionsThai: string[];
  /** Example sentence translated to Thai (if one exists) */
  examplesThai: string[];
}

// ── Combined response sent to the client ────────────────────────────

export interface DictionaryLookupResult {
  entries: DictionaryEntry[];
  thai: ThaiTranslation | null;
  /** Total round-trip time in ms */
  timingMs: number;
}
