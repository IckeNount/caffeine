/**
 * Compact RAG context for LLM prompts — fewer tokens than raw KB + pretty JSON.
 */

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}\n\n[…truncated…]`;
}

/** Dedupe by document title+category key (weak dedupe when same doc hits twice). */
export function dedupeKbChunks<
  T extends { document_title: string; document_category: string; content: string },
>(chunks: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of chunks) {
    const key = `${c.document_category}::${c.document_title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export interface KbChunkForContext {
  id: string;
  content: string;
  document_title: string;
  document_category: string;
  similarity: number;
}

/**
 * Build KB section string with per-chunk and total char caps.
 */
export function formatKbContextSection(
  chunks: KbChunkForContext[],
  options: {
    maxCharsPerChunk: number;
    maxTotalChars: number;
  }
): string {
  if (chunks.length === 0) return "";

  let used = 0;
  const parts: string[] = [
    "\n\n=== RELEVANT GRAMMAR RULES & PATTERNS ===\n",
    "Use these rules to ensure accurate analysis:\n\n",
  ];
  used += parts.join("").length;

  for (const chunk of chunks) {
    const header = `--- [${chunk.document_category}: ${chunk.document_title}] (relevance: ${(chunk.similarity * 100).toFixed(0)}%) ---\n`;
    const room = options.maxTotalChars - used - header.length;
    if (room < 200) break;

    const bodyCap = Math.min(options.maxCharsPerChunk, room);
    const body = truncateText(chunk.content, bodyCap) + "\n\n";
    const block = header + body;
    if (used + block.length > options.maxTotalChars) break;
    parts.push(block);
    used += block.length;
  }

  return parts.join("");
}

/** Minimal shape for few-shot (from stored result_json). */
export interface CompactAnalysisExample {
  sentence: string;
  simplified_english?: string;
  thai_translation?: string;
  chunks?: Array<{ text: string; type: string }>;
}

function pickCompactExample(result: Record<string, unknown>): CompactAnalysisExample {
  const chunksRaw = result.chunks;
  const chunks = Array.isArray(chunksRaw)
    ? (chunksRaw as Array<Record<string, unknown>>)
        .map((c) => ({
          text: String(c.text ?? ""),
          type: String(c.type ?? ""),
        }))
        .filter((c) => c.text.length > 0)
    : undefined;

  return {
    sentence: String(result.sentence ?? ""),
    simplified_english: result.simplified_english
      ? String(result.simplified_english)
      : undefined,
    thai_translation: result.thai_translation
      ? String(result.thai_translation)
      : undefined,
    chunks,
  };
}

/**
 * Format approved past analyses as compact JSON lines (no pretty-print).
 */
export function formatCompactFewShotSection(
  examples: Array<{
    sentence: string;
    result_json: Record<string, unknown>;
    similarity: number;
  }>,
  maxTotalChars: number,
  minSimilarity: number
): string {
  const filtered = examples.filter((e) => e.similarity >= minSimilarity);
  if (filtered.length === 0) return "";

  const lines: string[] = [
    "\n=== APPROVED EXAMPLE ANALYSES (compact) ===\n",
    "Match structure and teaching style (chunks + steps in your JSON output). Examples show chunk boundaries and types only — write full explanations for the new sentence.\n\n",
  ];
  let used = lines.join("").length;

  for (const ex of filtered) {
    const compact = pickCompactExample({
      ...ex.result_json,
      sentence: ex.sentence,
    });
    const line =
      JSON.stringify({ similarity: ex.similarity, ...compact }) + "\n";
    if (used + line.length > maxTotalChars) break;
    lines.push(line);
    used += line.length;
  }

  return lines.join("");
}
