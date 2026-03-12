import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";

export type TranslationProvider = "gemini" | "deepseek";

export interface TranslationResult {
  original: string;
  translation: string;
  provider: TranslationProvider;
  cached: boolean;
}

/**
 * Translate a single English sentence to Thai using the specified provider.
 */
export async function translateSentence(
  text: string,
  provider: TranslationProvider = "gemini",
): Promise<TranslationResult> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Empty text provided for translation");
  }

  if (provider === "gemini") {
    return translateWithGemini(cleanText);
  } else {
    return translateWithDeepSeek(cleanText);
  }
}

async function translateWithGemini(text: string): Promise<TranslationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-04-17",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          translation: {
            type: SchemaType.STRING,
            description: "The Thai translation of the English text",
          },
        },
        required: ["translation"],
      } as Schema,
    },
  });

  const prompt = `Translate the following English text to Thai. 
Provide a natural, accurate Thai translation that a Thai student would understand.
Keep the same tone and meaning as the original.

Text: "${text}"`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const json = JSON.parse(response.text());

  return {
    original: text,
    translation: json.translation,
    provider: "gemini",
    cached: false,
  };
}

async function translateWithDeepSeek(text: string): Promise<TranslationResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a professional English-to-Thai translator. Translate the given English text to natural, accurate Thai. Reply ONLY with the Thai translation, nothing else.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const translation = data.choices?.[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error("Empty translation from DeepSeek");
  }

  return {
    original: text,
    translation,
    provider: "deepseek",
    cached: false,
  };
}

/**
 * Split a block of text into individual sentences.
 * Handles common sentence boundaries: periods, exclamation marks, question marks.
 * Also splits on newlines for pasted text.
 */
export function splitTextToSentences(text: string): string[] {
  // First split by newlines (for pasted text / SRT format)
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 0);

  const sentences: string[] = [];

  for (const line of lines) {
    // Split by sentence-ending punctuation, keeping the punctuation
    const parts = line
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    sentences.push(...parts);
  }

  return sentences;
}

/**
 * Translate multiple sentences in batch with rate limiting.
 * Processes in batches of `batchSize` with delays between batches.
 */
export async function translateBatch(
  sentences: string[],
  provider: TranslationProvider = "gemini",
  batchSize: number = 5,
  delayMs: number = 1000,
  onProgress?: (completed: number, total: number) => void,
): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];

  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map((sentence) => translateSentence(sentence, provider)),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        // On failure, push error result (keep original text, empty translation)
        results.push({
          original: batch[j],
          translation: `[Translation failed: ${result.reason?.message || "Unknown error"}]`,
          provider,
          cached: false,
        });
      }
    }

    onProgress?.(Math.min(i + batchSize, sentences.length), sentences.length);

    // Delay between batches to avoid rate limits
    if (i + batchSize < sentences.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
