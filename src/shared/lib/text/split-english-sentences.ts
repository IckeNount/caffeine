function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Segment OCR or reading text without silently removing over-limit sentences. */
export function segmentEnglishSentences(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];

  const segments =
    typeof Intl.Segmenter === "function"
      ? Array.from(
          new Intl.Segmenter("en", { granularity: "sentence" }).segment(
            normalized,
          ),
          ({ segment }) => segment,
        )
      : normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];

  return segments.map(normalize).filter((sentence) => sentence.length > 0);
}

/** Split text into sentences accepted by the single-sentence analysis endpoint. */
export function splitEnglishSentences(text: string): string[] {
  return segmentEnglishSentences(text).filter((sentence) => sentence.length <= 500);
}
