import { getKbVersion, LINGUBREAK_PROMPT_VERSION } from "@/config/rag";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "@/shared/lib/rag/embeddings";
import type { RagTraceJson } from "@/shared/lib/rag/retriever";
import type { AIProvider } from "./providers";
import { parseAnalysisResult, type AnalysisResult } from "./schema";

export interface CacheAnalysisInput {
  sentence: string;
  provider: AIProvider;
  llmModel: string;
  result: AnalysisResult;
  chunkIds: string[];
  embedding: number[] | null;
  ragTraceJson: RagTraceJson | null;
  generateEmbeddingIfMissing?: boolean;
}

export function hashSentence(sentence: string): string {
  let hash = 0;
  for (let index = 0; index < sentence.length; index += 1) {
    hash = (hash << 5) - hash + sentence.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function sentenceHash(sentence: string): string {
  return hashSentence(sentence.trim().toLowerCase());
}

export async function getCachedAnalyses(
  sentences: string[],
  provider: AIProvider,
): Promise<Map<string, AnalysisResult>> {
  const cached = new Map<string, AnalysisResult>();
  if (sentences.length === 0) return cached;

  try {
    const { supabaseAdmin } = await import("@/shared/lib/db/supabase");
    const sentenceByHash = new Map(
      sentences.map((sentence) => [sentenceHash(sentence), sentence]),
    );
    const { data } = await supabaseAdmin
      .from("analyses")
      .select("sentence_hash,result_json")
      .in("sentence_hash", [...sentenceByHash.keys()])
      .eq("provider", provider);

    for (const row of data ?? []) {
      const sentence = sentenceByHash.get(row.sentence_hash);
      if (!sentence || !row.result_json) continue;
      try {
        cached.set(sentence, parseAnalysisResult(row.result_json));
      } catch {
        // Ignore stale or malformed cache rows.
      }
    }
  } catch {
    // Cache is optional; callers continue with generation.
  }

  return cached;
}

export async function getCachedAnalysis(
  sentence: string,
  provider: AIProvider,
): Promise<AnalysisResult | null> {
  return (await getCachedAnalyses([sentence], provider)).get(sentence) ?? null;
}

/** UUID strings from kb_chunks — safe for Postgres uuid[] when valid. */
function chunkIdsToUuidArray(chunkIds: string[]): string[] | null {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return chunkIds.length > 0 && chunkIds.every((id) => uuidPattern.test(id))
    ? chunkIds
    : null;
}

export async function cacheAnalysis(input: CacheAnalysisInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/shared/lib/db/supabase");
    let embedding = input.embedding;

    if (!embedding && input.generateEmbeddingIfMissing !== false) {
      try {
        const { embedText } = await import("@/shared/lib/rag/embeddings");
        embedding = await embedText(input.sentence);
      } catch {
        embedding = null;
      }
    }

    await supabaseAdmin.from("analyses").upsert(
      {
        sentence: input.sentence,
        sentence_hash: sentenceHash(input.sentence),
        embedding: embedding ? JSON.stringify(embedding) : null,
        provider: input.provider,
        llm_model: input.llmModel,
        embedding_model: EMBEDDING_MODEL,
        embedding_dim: EMBEDDING_DIM,
        prompt_version: LINGUBREAK_PROMPT_VERSION,
        kb_version: getKbVersion(),
        result_json: input.result,
        rag_chunks_used: input.chunkIds,
        retrieved_kb_chunk_ids: chunkIdsToUuidArray(input.chunkIds),
        rag_trace_json: input.ragTraceJson,
        status: "draft",
      },
      { onConflict: "sentence_hash" },
    );
  } catch {
    // Cache writes are best effort and never block a learner result.
  }
}
