"use client";

import { BookOpen, Loader2, RotateCcw, Volume2 } from "lucide-react";
import type { DictionaryLookupResult } from "../lib/schema";
import type { DictionaryStatus } from "../hooks/useDictionaryLookup";

interface DictionaryCardProps {
  word: string;
  status: DictionaryStatus;
  result: DictionaryLookupResult | null;
  error: string | null;
  onRetry: () => void;
}

function speakWord(word: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

export default function DictionaryCard({
  word,
  status,
  result,
  error,
  onRetry,
}: DictionaryCardProps) {
  const playPronunciation = async () => {
    if (!result?.audioUrl) {
      speakWord(word);
      return;
    }

    try {
      await new Audio(result.audioUrl).play();
    } catch {
      speakWord(word);
    }
  };

  if (status === "loading") {
    return (
      <div className="dictionary-card" role="status">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <p className="font-medium">
            กำลังค้นหาคำว่า <strong>{word}</strong>…
          </p>
        </div>
        <div className="mt-4 grid gap-2" aria-hidden="true">
          <span className="dictionary-skeleton h-7 w-1/2" />
          <span className="dictionary-skeleton h-4 w-full" />
          <span className="dictionary-skeleton h-4 w-4/5" />
        </div>
      </div>
    );
  }

  if (status === "not-found" || status === "error") {
    return (
      <div className="dictionary-card dictionary-card-error" role="status">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
        <p className="thai-reading mt-3">{error}</p>
        {status === "error" && (
          <button type="button" onClick={onRetry} className="learner-button learner-button-quiet mt-4">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            ลองอีกครั้ง · Retry
          </button>
        )}
      </div>
    );
  }

  if (!result) return null;

  return (
    <article className="dictionary-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">คำศัพท์ · Vocabulary</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">
              {word}
            </h4>
            {result.phonetic && (
              <span className="text-sm text-[var(--text-secondary)]">
                {result.phonetic}
              </span>
            )}
            {result.partOfSpeech && (
              <span className="part-of-speech">{result.partOfSpeech}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void playPronunciation()}
          className="learner-button learner-button-quiet"
          aria-label={`Listen to ${word}`}
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          ฟังเสียง · Listen
        </button>
      </div>

      <div className="dictionary-meaning mt-5">
        <p className="eyebrow">ความหมายภาษาไทย</p>
        <p lang="th" className="mt-1 font-thai text-xl font-semibold leading-[1.75] text-[var(--text-primary)]">
          {result.thaiMeaning}
        </p>
      </div>

      {result.definition && (
        <div className="mt-5">
          <p className="eyebrow">Simple English meaning</p>
          <p lang="en" className="mt-1 text-base leading-relaxed text-[var(--text-primary)]">
            {result.definition}
          </p>
          {result.example && (
            <p lang="en" className="mt-2 border-l-4 border-[var(--accent-teal)] pl-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              “{result.example}”
            </p>
          )}
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed text-[var(--text-secondary)]">
        คำแปลจาก {result.sources.thai}
        {result.sources.english ? ` · Definition from ${result.sources.english}` : ""}
        {result.partial ? " · Some dictionary details are unavailable." : ""}
      </p>
    </article>
  );
}
