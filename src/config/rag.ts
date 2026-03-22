/**
 * RAG retrieval limits — override via environment variables (optional).
 * Used by LinguBreak authoring pipeline only (not student reads).
 */

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface RagConfig {
  maxKbChunks: number;
  minKbSimilarity: number;
  maxPastAnalyses: number;
  minAnalysisSimilarity: number;
  maxKbCharsPerChunk: number;
  maxKbContextChars: number;
  maxFewShotChars: number;
}

export function getRagConfig(): RagConfig {
  return {
    maxKbChunks: envInt("RAG_MAX_KB_CHUNKS", 5),
    minKbSimilarity: envFloat("RAG_MIN_KB_SIMILARITY", 0.3),
    maxPastAnalyses: envInt("RAG_MAX_PAST_ANALYSES", 2),
    minAnalysisSimilarity: envFloat("RAG_MIN_ANALYSIS_SIMILARITY", 0.25),
    maxKbCharsPerChunk: envInt("RAG_MAX_KB_CHARS_PER_CHUNK", 2800),
    maxKbContextChars: envInt("RAG_MAX_KB_CONTEXT_CHARS", 9000),
    maxFewShotChars: envInt("RAG_MAX_FEW_SHOT_CHARS", 3500),
  };
}

/** Bump when system/user prompt shape changes (stored on analyses for provenance). */
export const LINGUBREAK_PROMPT_VERSION =
  process.env.LINGUBREAK_PROMPT_VERSION?.trim() || "lb-v1";

/** Set after KB ingest or bump manually — stored on analyses for provenance. */
export function getKbVersion(): string {
  return process.env.KB_INGEST_VERSION?.trim() || "kb-unknown";
}
