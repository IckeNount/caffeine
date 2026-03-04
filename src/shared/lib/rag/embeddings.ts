import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/** Embedding model — OpenAI text-embedding-3-small (1536 dimensions) */
const EMBEDDING_MODEL = "text-embedding-3-small";

/** Timeout (ms) for embedding API calls — fail fast when API is unreachable */
const EMBED_TIMEOUT_MS = 10_000;

/**
 * Generate a 1536-dim embedding vector using OpenAI's text-embedding-3-small.
 *
 * Includes a 10-second timeout so the RAG pipeline degrades gracefully
 * when the API is unreachable.
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await Promise.race([
    openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`OpenAI embedding timed out after ${EMBED_TIMEOUT_MS / 1000}s`)), EMBED_TIMEOUT_MS)
    ),
  ]);
  return result.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 * Uses OpenAI's native batch endpoint for efficiency.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const result = await Promise.race([
    openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`OpenAI batch embedding timed out after ${EMBED_TIMEOUT_MS / 1000}s`)), EMBED_TIMEOUT_MS)
    ),
  ]);

  // OpenAI returns embeddings in order of input
  return result.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
