import OpenAI from "openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DIRECT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: OPENROUTER_BASE_URL,
});

const directOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/** OpenRouter model slug for the existing 1536-dimensional embedding index. */
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";

/** Stored vector dimension (must match pgvector column + ingest script). */
export const EMBEDDING_DIM = 1536;

/** Timeout (ms) for embedding API calls — fail fast when API is unreachable. */
const EMBED_TIMEOUT_MS = 10_000;

async function embedOne(
  client: OpenAI,
  model: string,
  text: string,
  adapterName: string,
): Promise<number[]> {
  const result = await Promise.race([
    client.embeddings.create({ model, input: text }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${adapterName} embedding timed out after ${EMBED_TIMEOUT_MS / 1000}s`)),
        EMBED_TIMEOUT_MS,
      ),
    ),
  ]);
  return result.data[0].embedding;
}

async function embedMany(
  client: OpenAI,
  model: string,
  texts: string[],
  adapterName: string,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const result = await Promise.race([
    client.embeddings.create({ model, input: texts }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${adapterName} batch embedding timed out after ${EMBED_TIMEOUT_MS / 1000}s`)),
        EMBED_TIMEOUT_MS,
      ),
    ),
  ]);

  return result.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/** Generate an embedding through OpenRouter for normal demo execution. */
export function embedText(text: string): Promise<number[]> {
  return embedOne(openRouter, EMBEDDING_MODEL, text, "OpenRouter");
}

/** Generate batch embeddings through OpenRouter for normal demo execution. */
export function embedBatch(texts: string[]): Promise<number[][]> {
  return embedMany(openRouter, EMBEDDING_MODEL, texts, "OpenRouter");
}

/** Dormant direct OpenAI adapter reserved for a future fallback policy. */
export function embedTextWithOpenAI(text: string): Promise<number[]> {
  return embedOne(
    directOpenAI,
    DIRECT_OPENAI_EMBEDDING_MODEL,
    text,
    "OpenAI",
  );
}

/** Dormant direct OpenAI batch adapter reserved for a future fallback policy. */
export function embedBatchWithOpenAI(texts: string[]): Promise<number[][]> {
  return embedMany(
    directOpenAI,
    DIRECT_OPENAI_EMBEDDING_MODEL,
    texts,
    "OpenAI",
  );
}
