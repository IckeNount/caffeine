import { supabaseAdmin } from "@/shared/lib/db/supabase";
import { getRagConfig } from "@/config/rag";
import { embedBatch, embedText } from "./embeddings";
import {
  dedupeKbChunks,
  formatKbContextSection,
  formatCompactFewShotSection,
  type KbChunkForContext,
} from "./format-context";

interface RetrievedChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  document_title: string;
  document_category: string;
}

interface RetrievedAnalysis {
  id: string;
  sentence: string;
  result_json: Record<string, unknown>;
  similarity: number;
}

export interface RagTraceJson {
  kb_chunk_ids: string[];
  kb_chunk_count: number;
  past_analysis_count: number;
  kb_context_char_estimate: number;
  few_shot_char_estimate: number;
  embed_ms: number;
  search_ms: number;
}

/**
 * Retrieve relevant knowledge base chunks for a given sentence.
 * Accepts a pre-computed embedding to avoid redundant API calls.
 */
export async function retrieveContext(
  embedding: number[],
  options: {
    maxChunks?: number;
    category?: string | null;
    minSimilarity?: number;
  } = {}
): Promise<RetrievedChunk[]> {
  const cfg = getRagConfig();
  const {
    maxChunks = cfg.maxKbChunks,
    category = null,
    minSimilarity = cfg.minKbSimilarity,
  } = options;

  const { data, error } = await supabaseAdmin.rpc("match_kb_chunks", {
    query_embedding: JSON.stringify(embedding),
    match_count: maxChunks,
    filter_category: category,
  });

  if (error) {
    console.error("RAG retrieval error:", error);
    return [];
  }

  return (data || []).filter(
    (chunk: RetrievedChunk) => chunk.similarity >= minSimilarity
  );
}

/**
 * Retrieve similar approved analyses for compact few-shot context.
 */
export async function retrieveSimilarAnalyses(
  embedding: number[],
  maxResults?: number
): Promise<RetrievedAnalysis[]> {
  const cfg = getRagConfig();
  const cap = maxResults ?? cfg.maxPastAnalyses;

  const { data, error } = await supabaseAdmin.rpc("match_analyses", {
    query_embedding: JSON.stringify(embedding),
    match_count: cap,
  });

  if (error) {
    console.error("Analysis retrieval error:", error);
    return [];
  }

  return data || [];
}

export interface BuildRAGContextResult {
  context: string;
  chunkIds: string[];
  embedding: number[];
  ragTraceJson: RagTraceJson;
}

export interface BatchRagContext extends BuildRAGContextResult {
  sentence: string;
}

async function buildContextFromEmbedding(
  sentence: string,
  embedding: number[],
  embedMs: number,
): Promise<BatchRagContext> {
  const cfg = getRagConfig();
  const searchStartedAt = Date.now();
  const [kbResult, analysesResult] = await Promise.allSettled([
    retrieveContext(embedding, {
      maxChunks: cfg.maxKbChunks,
      minSimilarity: cfg.minKbSimilarity,
    }),
    retrieveSimilarAnalyses(embedding, cfg.maxPastAnalyses),
  ]);
  const kbRaw = kbResult.status === "fulfilled" ? kbResult.value : [];
  const pastAnalyses =
    analysesResult.status === "fulfilled" ? analysesResult.value : [];
  const searchMs = Date.now() - searchStartedAt;

  const kbForContext: KbChunkForContext[] = dedupeKbChunks(kbRaw).map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    document_title: chunk.document_title,
    document_category: chunk.document_category,
    similarity: chunk.similarity,
  }));
  const kbSection = formatKbContextSection(kbForContext, {
    maxCharsPerChunk: cfg.maxKbCharsPerChunk,
    maxTotalChars: cfg.maxKbContextChars,
  });
  const fewShotSection = formatCompactFewShotSection(
    pastAnalyses,
    cfg.maxFewShotChars,
    cfg.minAnalysisSimilarity,
  );
  const chunkIds = kbForContext.map((chunk) => chunk.id);

  return {
    sentence,
    context: kbSection + fewShotSection,
    chunkIds,
    embedding,
    ragTraceJson: {
      kb_chunk_ids: chunkIds,
      kb_chunk_count: kbForContext.length,
      past_analysis_count: pastAnalyses.length,
      kb_context_char_estimate: kbSection.length,
      few_shot_char_estimate: fewShotSection.length,
      embed_ms: embedMs,
      search_ms: searchMs,
    },
  };
}

/**
 * Build the RAG-augmented context string to inject into the LLM prompt.
 * Embeds the sentence once; retrieves KB + past analyses in parallel.
 */
export async function buildRAGContext(sentence: string): Promise<BuildRAGContextResult> {
  const t0 = Date.now();
  const embedding = await embedText(sentence);
  const embedMs = Date.now() - t0;
  console.log(`⏱️  RAG embed: ${embedMs}ms`);
  const built = await buildContextFromEmbedding(sentence, embedding, embedMs);
  console.log(
    `⏱️  RAG search: ${built.ragTraceJson.search_ms}ms (${built.ragTraceJson.kb_chunk_count} KB chunks, ${built.ragTraceJson.past_analysis_count} past analyses)`,
  );
  return built;
}

/** Embed all uncached sentences in one provider call, then retrieve each context independently. */
export async function buildRAGContexts(sentences: string[]): Promise<BatchRagContext[]> {
  if (sentences.length === 0) return [];
  const startedAt = Date.now();
  const embeddings = await embedBatch(sentences);
  if (embeddings.length !== sentences.length) {
    throw new Error("Batch embedding returned an incomplete result.");
  }
  const embedMs = Date.now() - startedAt;
  return Promise.all(
    embeddings.map((embedding, index) =>
      buildContextFromEmbedding(sentences[index], embedding, embedMs),
    ),
  );
}
