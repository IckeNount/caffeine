import type { AnalysisResult } from "@/features/lingubreak/lib/schema";
import type { LessonSegment } from "@/shared/types/lesson-types";

const CHUNK_TYPES = new Set([
  "subject",
  "verb",
  "object",
  "relative_clause",
  "prepositional",
  "modifier",
]);

function isAnalysisChunk(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.text === "string" &&
    typeof o.type === "string" &&
    CHUNK_TYPES.has(o.type) &&
    typeof o.explanation === "string" &&
    typeof o.thai_explanation === "string"
  );
}

function isPedagogicalStep(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.step_number === "number" &&
    typeof o.title === "string" &&
    typeof o.title_thai === "string" &&
    typeof o.description === "string" &&
    typeof o.description_thai === "string" &&
    typeof o.highlighted_text === "string"
  );
}

/**
 * Returns a full AnalysisResult if JSON matches LinguBreak output shape.
 */
export function parseGrammarBreakdownToAnalysisResult(
  raw: unknown
): AnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (!Array.isArray(o.chunks) || !o.chunks.every(isAnalysisChunk)) return null;
  if (typeof o.simplified_english !== "string") return null;
  if (typeof o.thai_translation !== "string") return null;
  if (
    !Array.isArray(o.thai_reordered_chunks) ||
    !o.thai_reordered_chunks.every(isAnalysisChunk)
  )
    return null;
  if (
    !Array.isArray(o.pedagogical_steps) ||
    !o.pedagogical_steps.every(isPedagogicalStep)
  )
    return null;

  return {
    chunks: o.chunks as AnalysisResult["chunks"],
    simplified_english: o.simplified_english,
    thai_translation: o.thai_translation,
    thai_reordered_chunks: o.thai_reordered_chunks as AnalysisResult["thai_reordered_chunks"],
    pedagogical_steps: o.pedagogical_steps as AnalysisResult["pedagogical_steps"],
  };
}

function normSentence(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Match double-clicked sentence text to a lesson segment and return stored breakdown.
 */
export function findBreakdownForSelection(
  segments: LessonSegment[],
  sentence: string | null
): AnalysisResult | null {
  if (!sentence?.trim()) return null;
  const target = normSentence(sentence);
  for (const seg of segments) {
    const full = normSentence(seg.original_text);
    if (full.includes(target) || target.includes(full)) {
      const parsed = parseGrammarBreakdownToAnalysisResult(seg.grammar_breakdown);
      if (parsed) return parsed;
    }
  }
  return null;
}
