"use client";

import React, { useState } from "react";
import { Zap, Loader2, ChevronDown, RotateCcw } from "lucide-react";

const EXAMPLE_SENTENCES = [
  "The student who studied hard passed the exam that was given by the professor.",
  "The book that I borrowed from the library which was built in 1920 is very interesting.",
  "The teacher whose class I attended yesterday explained the concept that confused many students.",
  "The restaurant where we had dinner last night serves food that is imported from Italy.",
  "The man who lives next door, who is a doctor, helped the child that fell off the bicycle.",
];

interface SentenceInputProps {
  onAnalyze: (sentence: string) => void;
  onReset: () => void;
  loading: boolean;
  hasResult: boolean;
}

export default function SentenceInput({
  onAnalyze,
  onReset,
  loading,
  hasResult,
}: SentenceInputProps) {
  const [sentence, setSentence] = useState("");
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sentence.trim() && !loading) {
      onAnalyze(sentence.trim());
    }
  };

  const handleExample = (example: string) => {
    setSentence(example);
    setShowExamples(false);
  };

  const handleReset = () => {
    setSentence("");
    onReset();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="relative">
        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="Type or paste an English sentence here..."
          className="brutal-input w-full min-h-[120px] p-4 pr-12 text-lg font-light resize-none"
          maxLength={500}
          disabled={loading}
        />
        <span
          className="absolute bottom-3 right-4 text-xs tabular-nums font-heading"
          style={{ color: 'var(--text-muted)' }}
        >
          {sentence.length}/500
        </span>
      </div>

      {/* Example Sentences Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <span className="font-heading uppercase tracking-wider text-xs">Try an example</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${showExamples ? "rotate-180" : ""}`}
          />
        </button>

        {showExamples && (
          <div
            className="absolute top-full left-0 right-0 mt-2 z-20 overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '3px solid var(--border-brutal)',
              boxShadow: 'var(--shadow-brutal)',
            }}
          >
            {EXAMPLE_SENTENCES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleExample(ex)}
                className="w-full text-left px-4 py-3 text-sm transition-colors duration-100"
                style={{
                  color: 'var(--text-secondary)',
                  borderBottom: i < EXAMPLE_SENTENCES.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-gold)';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!sentence.trim() || loading}
          className="brutal-btn brutal-btn-primary flex-1 px-6 py-3.5 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Break It Down</span>
            </>
          )}
        </button>

        {hasResult && (
          <button
            type="button"
            onClick={handleReset}
            className="brutal-btn brutal-btn-secondary px-5 py-3.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </form>
  );
}
