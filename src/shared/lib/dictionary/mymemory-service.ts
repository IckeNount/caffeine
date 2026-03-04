import { DictionaryEntry, ThaiTranslation } from '@/features/dictionary/types';

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

/**
 * Translates a single text string from English to Thai using MyMemory API.
 * 100% free, no API key, no tokens consumed.
 */
async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return '';

  // Clean the input: strip parenthetical content, quotes, and special chars
  // that confuse machine translation of dictionary definitions
  const cleaned = cleanDefinitionForTranslation(text);
  if (!cleaned) return '';

  const url = `${MYMEMORY_API}?q=${encodeURIComponent(cleaned)}&langpair=en|th`;

  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return '';

    const data = await response.json();
    const translated = data?.responseData?.translatedText || '';

    // Decode any HTML entities that MyMemory might return
    return decodeHtmlEntities(translated);
  } catch {
    return '';
  }
}

/**
 * Cleans a dictionary definition to produce better machine translations.
 *
 * Dictionary definitions often contain parenthetical clarifications,
 * quotes, and metalanguage that confuse generic MT engines.
 * We simplify them to their core meaning.
 */
function cleanDefinitionForTranslation(text: string): string {
  let cleaned = text;

  // Remove parenthetical content: "A greeting (salutation) said..." → "A greeting said..."
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Remove leading articles for single-phrase definitions
  // "The act of greeting" → "act of greeting" (translates better)
  cleaned = cleaned.replace(/^(The |An |A )/i, '');

  // Remove trailing periods
  cleaned = cleaned.replace(/\.\s*$/, '');

  // Remove escaped quotes from the Free Dictionary API
  cleaned = cleaned.replace(/\\"/g, '');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If the definition is too long, take just the first clause
  // Long sentences produce worse MT output
  if (cleaned.length > 100) {
    const firstClause = cleaned.split(/[,;]/)[0];
    if (firstClause && firstClause.length >= 10) {
      cleaned = firstClause.trim();
    }
  }

  return cleaned;
}

/**
 * Decodes HTML entities that may appear in MyMemory responses.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    // Remove any stray HTML/XML tags from the translation memory
    .replace(/<[^>]*>/g, '');
}

/**
 * Maps an English part-of-speech string to its Thai equivalent.
 * No API call needed — static lookup.
 */
function mapPartOfSpeechToThai(pos: string): string {
  const map: Record<string, string> = {
    noun: 'คำนาม',
    verb: 'คำกริยา',
    adjective: 'คำคุณศัพท์',
    adverb: 'คำวิเศษณ์',
    pronoun: 'สรรพนาม',
    preposition: 'คำบุพบท',
    conjunction: 'คำสันธาน',
    interjection: 'คำอุทาน',
    determiner: 'คำกำหนด',
    article: 'คำนำหน้านาม',
  };
  return map[pos.toLowerCase()] || pos;
}

/**
 * Translates an English dictionary entry into Thai using MyMemory API (free).
 *
 * Sends batch translation requests in parallel for speed.
 * Cleans definitions before translating for higher quality output.
 */
export async function translateToThaiFree(
  entries: DictionaryEntry[]
): Promise<ThaiTranslation> {
  const entry = entries[0];

  // Kick off all translations in parallel
  const wordTranslationPromise = translateText(entry.word);

  const meaningPromises = entry.meanings.map(async (meaning) => {
    const defPromises = meaning.definitions.map((def) =>
      translateText(def.definition)
    );
    const examplePromises = meaning.definitions.map((def) =>
      def.example ? translateText(def.example) : Promise.resolve('')
    );

    const [definitionsThai, examplesThai] = await Promise.all([
      Promise.all(defPromises),
      Promise.all(examplePromises),
    ]);

    return {
      partOfSpeechThai: mapPartOfSpeechToThai(meaning.partOfSpeech),
      definitionsThai,
      examplesThai,
    };
  });

  const [wordThai, ...meanings] = await Promise.all([
    wordTranslationPromise,
    ...meaningPromises,
  ]);

  return { wordThai, meanings };
}
