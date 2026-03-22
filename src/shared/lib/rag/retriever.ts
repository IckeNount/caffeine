import { supabaseAdmin } from "@/shared/lib/db/supabase";
import { getRagConfig } from "@/config/rag";
import { embedText } from "./embeddings";
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
 * Retrieve similar past analyses (approved by teachers).
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

/**
 * Build the RAG-augmented context string to inject into the LLM prompt.
 * Embeds the sentence once; retrieves KB + past analyses in parallel.
 */
export async function buildRAGContext(sentence: string): Promise<BuildRAGContextResult> {
  const cfg = getRagConfig();

  const t0 = Date.now();
  const embedding = await embedText(sentence);
  const embedMs = Date.now() - t0;
  console.log(`⏱️  RAG embed: ${embedMs}ms`);

  const t1 = Date.now();
  const [kbRaw, pastAnalyses] = await Promise.all([
    retrieveContext(embedding, {
      maxChunks: cfg.maxKbChunks,
      minSimilarity: cfg.minKbSimilarity,
    }),
    retrieveSimilarAnalyses(embedding, cfg.maxPastAnalyses),
  ]);
  const searchMs = Date.now() - t1;

  const kbDeduped = dedupeKbChunks(kbRaw);
  const kbForCtx: KbChunkForContext[] = kbDeduped.map((c) => ({
    id: c.id,
    content: c.content,
    document_title: c.document_title,
    document_category: c.document_category,
    similarity: c.similarity,
  }));

  const kbSection = formatKbContextSection(kbForCtx, {
    maxCharsPerChunk: cfg.maxKbCharsPerChunk,
    maxTotalChars: cfg.maxKbContextChars,
  });

  const fewShotSection = formatCompactFewShotSection(
    pastAnalyses,
    cfg.maxFewShotChars,
    cfg.minAnalysisSimilarity
  );

  const context = kbSection + fewShotSection;
  const chunkIds = kbForCtx.map((c) => c.id);

  console.log(
    `⏱️  RAG search: ${searchMs}ms (${kbForCtx.length} KB chunks, ${pastAnalyses.length} past analyses)`
  );

  const ragTraceJson: RagTraceJson = {
    kb_chunk_ids: chunkIds,
    kb_chunk_count: kbForCtx.length,
    past_analysis_count: pastAnalyses.length,
    kb_context_char_estimate: kbSection.length,
    few_shot_char_estimate: fewShotSection.length,
    embed_ms: embedMs,
    search_ms: searchMs,
  };

  return { context, chunkIds, embedding, ragTraceJson };
}
