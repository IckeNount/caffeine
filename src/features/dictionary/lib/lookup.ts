import { z } from "zod";
import {
  DictionaryLookupResultSchema,
  type DictionaryLookupResult,
} from "./schema";

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const FREE_DICTIONARY_URL =
  "https://api.dictionaryapi.dev/api/v2/entries/en";
const LOOKUP_TIMEOUT_MS = 8_000;

const MyMemoryResponseSchema = z.object({
  responseStatus: z.union([z.number(), z.string()]).optional(),
  responseData: z
    .object({
      translatedText: z.string().optional(),
    })
    .optional(),
});

const FreeDictionaryResponseSchema = z.array(
  z.object({
    word: z.string().optional(),
    phonetic: z.string().optional(),
    phonetics: z
      .array(
        z.object({
          text: z.string().optional(),
          audio: z.string().optional(),
        }),
      )
      .optional(),
    meanings: z
      .array(
        z.object({
          partOfSpeech: z.string().optional(),
          definitions: z
            .array(
              z.object({
                definition: z.string().optional(),
                example: z.string().optional(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
  }),
);

export type DictionaryLookupErrorCode =
  | "WORD_NOT_FOUND"
  | "DICTIONARY_UNAVAILABLE";

export class DictionaryLookupError extends Error {
  constructor(
    readonly code: DictionaryLookupErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function cleanText(value: string | undefined): string | null {
  const cleaned = value?.replaceAll("&quot;", '"').replaceAll("&#39;", "'").trim();
  return cleaned || null;
}

function normalizeAudioUrl(value: string | undefined): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  return cleaned.startsWith("//") ? `https:${cleaned}` : cleaned;
}

async function fetchThaiMeaning(
  word: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const params = new URLSearchParams({
    q: word,
    langpair: "en|th",
    mt: "1",
  });
  const response = await fetchImpl(`${MYMEMORY_URL}?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new DictionaryLookupError(
      "DICTIONARY_UNAVAILABLE",
      `MyMemory returned HTTP ${response.status}`,
    );
  }

  const parsed = MyMemoryResponseSchema.safeParse(await response.json());
  const status = Number(parsed.data?.responseStatus ?? response.status);
  const thaiMeaning = cleanText(parsed.data?.responseData?.translatedText);
  if (!parsed.success || status >= 400) {
    throw new DictionaryLookupError(
      "DICTIONARY_UNAVAILABLE",
      "MyMemory returned an invalid response",
    );
  }
  if (!thaiMeaning || thaiMeaning.toLowerCase() === word.toLowerCase()) {
    throw new DictionaryLookupError(
      "WORD_NOT_FOUND",
      "No Thai meaning was found",
    );
  }

  return thaiMeaning;
}

interface EnglishDetails {
  phonetic: string | null;
  partOfSpeech: string | null;
  definition: string | null;
  example: string | null;
  audioUrl: string | null;
}

async function fetchEnglishDetails(
  word: string,
  fetchImpl: typeof fetch,
): Promise<EnglishDetails> {
  const response = await fetchImpl(
    `${FREE_DICTIONARY_URL}/${encodeURIComponent(word)}`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Dictionary returned HTTP ${response.status}`);

  const parsed = FreeDictionaryResponseSchema.safeParse(await response.json());
  const entry = parsed.data?.[0];
  if (!parsed.success || !entry) throw new Error("Dictionary response was invalid");

  const meaning = entry.meanings?.find((item) =>
    item.definitions?.some((definition) => cleanText(definition.definition)),
  );
  const definition = meaning?.definitions?.find((item) =>
    cleanText(item.definition),
  );
  const audio = entry.phonetics?.find((item) => cleanText(item.audio));
  const phonetic =
    cleanText(entry.phonetic) ??
    cleanText(entry.phonetics?.find((item) => cleanText(item.text))?.text);

  return {
    phonetic,
    partOfSpeech: cleanText(meaning?.partOfSpeech),
    definition: cleanText(definition?.definition),
    example: cleanText(definition?.example),
    audioUrl: normalizeAudioUrl(audio?.audio),
  };
}

export async function lookupDictionary(
  word: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DictionaryLookupResult> {
  const [thaiResult, englishResult] = await Promise.allSettled([
    fetchThaiMeaning(word, fetchImpl),
    fetchEnglishDetails(word, fetchImpl),
  ]);

  if (thaiResult.status === "rejected") {
    if (thaiResult.reason instanceof DictionaryLookupError) {
      throw thaiResult.reason;
    }
    throw new DictionaryLookupError(
      "DICTIONARY_UNAVAILABLE",
      "Thai dictionary lookup failed",
    );
  }

  const english =
    englishResult.status === "fulfilled" ? englishResult.value : null;

  return DictionaryLookupResultSchema.parse({
    word,
    thaiMeaning: thaiResult.value,
    phonetic: english?.phonetic ?? null,
    partOfSpeech: english?.partOfSpeech ?? null,
    definition: english?.definition ?? null,
    example: english?.example ?? null,
    audioUrl: english?.audioUrl ?? null,
    partial: english === null,
    sources: {
      thai: "MyMemory",
      english: english ? "Free Dictionary API" : null,
    },
  });
}
