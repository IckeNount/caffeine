"use client";

import React, { useCallback, useRef, useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────

export interface InteractiveTextProps {
  /** The full text to render */
  text: string;
  /** Called on single-click with the clicked word */
  onWordClick: (word: string) => void;
  /** Called on double-click with the full sentence containing the clicked word */
  onSentenceSelect: (sentence: string) => void;
  /** Optional className for the container */
  className?: string;
}

/**
 * Renders text where each word is clickable.
 * Single click → triggers word lookup.
 * Double click → auto-selects the full sentence and triggers sentence breakdown.
 */
const InteractiveText = React.memo(function InteractiveText({
  text,
  onWordClick,
  onSentenceSelect,
  className,
}: InteractiveTextProps) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preventSingleRef = useRef(false);

  // Split text into sentences and tokens while preserving them
  const parsedSentences = useMemo(() => {
    if (!text) return [];
    const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
    return sentences.map((sentence) => ({
      original: sentence,
      tokens: sentence.split(/(\s+)/),
    }));
  }, [text]);

  const handleWordClick = useCallback(
    (word: string) => {
      // Use a timer, so if a double-click follows we can cancel
      preventSingleRef.current = false;
      clickTimerRef.current = setTimeout(() => {
        if (!preventSingleRef.current) {
          // Clean the word: strip trailing punctuation for lookup
          const cleanWord = word.replace(/[^a-zA-Z'-]/g, "");
          if (cleanWord) onWordClick(cleanWord);
        }
      }, 250);
    },
    [onWordClick],
  );

  const handleWordDoubleClick = useCallback(
    (sentence: string) => {
      // Cancel the single-click
      preventSingleRef.current = true;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const clean = sentence.trim();
      if (clean) onSentenceSelect(clean);
    },
    [onSentenceSelect],
  );

  return (
    <span className={className}>
      {parsedSentences.map(({ original, tokens }, si) => (
        <span key={si} className="interactive-sentence">
          {tokens.map((token, wi) => {
            // If it's whitespace, render as-is
            if (/^\s+$/.test(token)) {
              return <span key={`${si}-ws-${wi}`}>{token}</span>;
            }
            return (
              <span
                key={`${si}-w-${wi}`}
                className="interactive-word"
                onClick={() => handleWordClick(token)}
                onDoubleClick={() => handleWordDoubleClick(original)}
                style={{ cursor: "pointer" }}
              >
                {token}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
});

export default InteractiveText;
