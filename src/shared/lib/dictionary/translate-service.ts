import { GoogleGenerativeAI } from '@google/generative-ai';
import { DictionaryEntry, ThaiTranslation } from '@/features/dictionary/types';

/**
 * AI-enhanced Thai translation using Gemini 2.5 Flash.
 *
 * This is OPTIONAL and only runs when the user explicitly enables
 * "Enhance with AI" in the UI. Consumes Gemini API quota.
 */
export async function translateToThaiAI(
  entries: DictionaryEntry[]
): Promise<ThaiTranslation> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const entry = entries[0];

  const meaningsForPrompt = entry.meanings.map((m, mi) => ({
    idx: mi,
    pos: m.partOfSpeech,
    defs: m.definitions.map((d, di) => ({
      idx: di,
      en: d.definition,
      example: d.example || null,
    })),
  }));

  const prompt = `You are an expert English-to-Thai translator for a dictionary app.  
Given the English word and its meanings below, provide Thai translations.

Word: "${entry.word}"

Meanings:
${JSON.stringify(meaningsForPrompt, null, 2)}

Respond ONLY with valid JSON in this exact schema (no markdown, no code fences):
{
  "wordThai": "<Thai translation of the word>",
  "meanings": [
    {
      "partOfSpeechThai": "<Thai part-of-speech label, e.g. คำนาม, คำกริยา, คำคุณศัพท์, คำวิเศษณ์>",
      "definitionsThai": ["<Thai translation of definition 0>", "<Thai translation of definition 1>", ...],
      "examplesThai": ["<Thai translation of example 0 or empty string if no example>", ...]
    }
  ]
}

Rules:
- Keep translations natural and concise — this is a dictionary, not a paragraph.
- Match the array lengths exactly: one Thai definition per English definition, one Thai example per English definition.
- If there is no English example, use an empty string "" for that slot.
- partOfSpeechThai must be the standard Thai grammatical label.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as ThaiTranslation;
    return parsed;
  } catch (error) {
    console.error('[AI Translation Error]', error);
    throw error; // Let the caller handle fallback
  }
}
