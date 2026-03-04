import { supabaseAdmin } from "@/shared/lib/db/supabase";
import { embedText } from "./embeddings";

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

/**
 * Retrieve relevant knowledge base chunks for a given sentence.
 * Accepts a pre-computed embedding to avoid redundant API calls.
 */
export async function retrieveContext(
  embedding: number[],
  options: {
    maxChunks?: number;
    category?: string;
    minSimilarity?: number;
  } = {}
): Promise<RetrievedChunk[]> {
  const {
    maxChunks = 5,
    category = null,
    minSimilarity = 0.3,
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
 * Accepts a pre-computed embedding to avoid redundant API calls.
 */
export async function retrieveSimilarAnalyses(
  embedding: number[],
  maxResults: number = 3
): Promise<RetrievedAnalysis[]> {
  const { data, error } = await supabaseAdmin.rpc("match_analyses", {
    query_embedding: JSON.stringify(embedding),
    match_count: maxResults,
  });

  if (error) {
    console.error("Analysis retrieval error:", error);
    return [];
  }

  return data || [];
}

/**
 * Build the RAG-augmented context string to inject into the LLM prompt.
 * Combines grammar rules, error patterns, and past examples.
 * 
 * Optimization: embeds the sentence ONCE and shares the vector
 * across both KB retrieval and analysis retrieval.
 */
export async function buildRAGContext(sentence: string): Promise<{
  context: string;
  chunkIds: string[];
}> {
  // 1. Embed the sentence ONCE (saves a full Gemini API round-trip)
  const t0 = Date.now();
  const embedding = await embedText(sentence);
  console.log(`⏱️  RAG embed: ${Date.now() - t0}ms`);

  // 2. Retrieve KB chunks + past analyses in parallel (using shared embedding)
  const t1 = Date.now();
  const [kbChunks, pastAnalyses] = await Promise.all([
    retrieveContext(embedding, { maxChunks: 5, minSimilarity: 0.3 }),
    retrieveSimilarAnalyses(embedding, 2),
  ]);
  console.log(`⏱️  RAG search: ${Date.now() - t1}ms (${kbChunks.length} KB chunks, ${pastAnalyses.length} past analyses)`);

  const chunkIds = kbChunks.map((c) => c.id);

  let context = "";

  // Add grammar rules and patterns
  if (kbChunks.length > 0) {
    context += "\n\n=== RELEVANT GRAMMAR RULES & PATTERNS ===\n";
    context += "Use these rules to ensure accurate analysis:\n\n";
    for (const chunk of kbChunks) {
      context += `--- [${chunk.document_category}: ${chunk.document_title}] (relevance: ${(chunk.similarity * 100).toFixed(0)}%) ---\n`;
      context += chunk.content + "\n\n";
    }
  }

  // Add past approved examples as few-shot
  if (pastAnalyses.length > 0) {
    context += "\n=== APPROVED EXAMPLE ANALYSES ===\n";
    context += "Follow the style and accuracy of these teacher-approved breakdowns:\n\n";
    for (const analysis of pastAnalyses) {
      context += `Sentence: "${analysis.sentence}"\n`;
      context += `Analysis: ${JSON.stringify(analysis.result_json, null, 2)}\n\n`;
    }
  }

  return { context, chunkIds };
}
