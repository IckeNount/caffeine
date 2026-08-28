function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Split OCR or reading text into sentences accepted by `/api/analyze`. */
export function splitEnglishSentences(text: string): string[] {
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

  return segments
    .map(normalize)
    .filter((sentence) => sentence.length > 0 && sentence.length <= 500);
}
