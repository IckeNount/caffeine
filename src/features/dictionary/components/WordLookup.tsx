"use client";

import { MousePointer2 } from "lucide-react";
import type { AnalysisChunk } from "@/features/lingubreak/lib/schema";
import DictionaryCard from "./DictionaryCard";
import { useDictionaryLookup } from "../hooks/useDictionaryLookup";

interface WordLookupProps {
  chunks: AnalysisChunk[];
}

const WORD_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

export function wordsFromChunks(chunks: AnalysisChunk[]): string[] {
  return chunks.flatMap((chunk) => chunk.text.match(WORD_PATTERN) ?? []);
}

export default function WordLookup({ chunks }: WordLookupProps) {
  const words = wordsFromChunks(chunks);
  const { selectedWord, status, result, error, selectWord, retry } =
    useDictionaryLookup();

  return (
    <section className="learner-card p-5 sm:p-7" aria-labelledby="word-lookup-title">
      <div className="flex items-start gap-3">
        <span className="section-icon section-icon-teal" aria-hidden="true">
          <MousePointer2 className="h-5 w-5" />
        </span>
        <div>
          <h2 id="word-lookup-title" className="section-heading">
            แตะคำศัพท์
          </h2>
          <p className="section-subtitle">Tap a word to see its Thai meaning</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Words in the sentence">
        {words.map((word, index) => {
          const selected =
            selectedWord?.toLowerCase() === word.toLowerCase();
          return (
            <button
              key={`${word}-${index}`}
              type="button"
              aria-pressed={selected}
              onClick={() => selectWord(word)}
              className="word-chip"
            >
              {word}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-5">
        {selectedWord && (
          <DictionaryCard
            word={selectedWord}
            status={status}
            result={result}
            error={error}
            onRetry={retry}
          />
        )}
      </div>
    </section>
  );
}
