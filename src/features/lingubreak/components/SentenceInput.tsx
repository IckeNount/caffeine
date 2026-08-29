"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, RotateCcw, ScanLine, WandSparkles } from "lucide-react";
import { DailyReadingPanel } from "@/features/daily-reading";
import { OcrInputPanel } from "@/features/ocr";
import type { AnalysisResult } from "@/features/lingubreak/lib/schema";

const EXAMPLE_SENTENCES = [
  "The student who studied hard passed the exam that was given by the professor.",
  "The book that I borrowed from the library which was built in 1920 is very interesting.",
  "The teacher whose class I attended yesterday explained the concept that confused many students.",
  "The restaurant where we had dinner last night serves food that is imported from Italy.",
  "The man who lives next door, who is a doctor, helped the child that fell off the bicycle.",
];

interface SentenceInputProps {
  onAnalyze: (sentence: string) => void;
  onReadyAnalysis: (sentence: string, result: AnalysisResult) => void;
  onReset: () => void;
  loading: boolean;
  hasResult: boolean;
}

export default function SentenceInput({
  onAnalyze,
  onReadyAnalysis,
  onReset,
  loading,
  hasResult,
}: SentenceInputProps) {
  const [sentence, setSentence] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [activeSource, setActiveSource] = useState<"daily" | "scan" | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const busy = loading || batchLoading;
  const showManualAnalysis = activeSource !== "scan";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (sentence.trim() && !busy) onAnalyze(sentence.trim());
  };

  const chooseReadyAnalysis = (value: string, result: AnalysisResult) => {
    setSentence(value);
    setShowExamples(false);
    onReadyAnalysis(value, result);
  };

  const chooseSentence = (value: string) => {
    setSentence(value);
    setActiveSource(null);
    setShowExamples(false);
  };

  const handleReset = () => {
    setSentence("");
    setActiveSource(null);
    setShowExamples(false);
    onReset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 lang="th" className="font-heading text-xl font-semibold">เลือกประโยคที่อยากเข้าใจ</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
          Type your own sentence, choose today’s reading, or scan a page.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveSource((source) => (source === "daily" ? null : "daily"))}
          disabled={busy}
          aria-expanded={activeSource === "daily"}
          className={`learner-button ${activeSource === "daily" ? "learner-button-primary" : "learner-button-quiet"}`}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span><span lang="th" className="font-thai">บทอ่านวันนี้</span><span className="hidden sm:inline"> · Today</span></span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSource((source) => (source === "scan" ? null : "scan"))}
          disabled={busy}
          aria-expanded={activeSource === "scan"}
          className={`learner-button ${activeSource === "scan" ? "learner-button-primary" : "learner-button-quiet"}`}
        >
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          <span><span lang="th" className="font-thai">สแกนข้อความ</span><span className="hidden sm:inline"> · Scan</span></span>
        </button>
      </div>

      <DailyReadingPanel open={activeSource === "daily"} onSelect={chooseSentence} />
      <OcrInputPanel
        open={activeSource === "scan"}
        onReadyAnalysis={chooseReadyAnalysis}
        onLoadingChange={setBatchLoading}
      />

      {showManualAnalysis && (
        <div data-manual-analysis-input>
          <label htmlFor="sentence-input" className="eyebrow">ประโยคภาษาอังกฤษ · English sentence</label>
          <div className="relative mt-2">
            <textarea
              id="sentence-input"
              value={sentence}
              onChange={(event) => setSentence(event.target.value)}
              placeholder="Type or paste one English sentence…"
              className="learner-input min-h-[128px] resize-y p-4 pb-9 text-lg leading-relaxed"
              maxLength={500}
              disabled={busy}
            />
            <span className="absolute bottom-3 right-4 text-xs tabular-nums text-[var(--text-secondary)]">
              {sentence.length}/500
            </span>
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowExamples((open) => !open)}
          disabled={busy}
          aria-expanded={showExamples}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ลองประโยคตัวอย่าง · Try an example
          <ChevronDown className={`h-4 w-4 transition-transform ${showExamples ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {showExamples && (
          <div className="mt-2 grid gap-2 rounded-2xl bg-[#FFF9E8] p-3">
            {EXAMPLE_SENTENCES.map((example, index) => (
              <button
                key={example}
                type="button"
                onClick={() => chooseSentence(example)}
                disabled={busy}
                className="sentence-choice"
              >
                <span className="sentence-number">{index + 1}</span>
                <span className="text-sm leading-relaxed sm:text-base">{example}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {(showManualAnalysis || hasResult) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {showManualAnalysis && (
            <button
              type="submit"
              data-manual-analysis-submit
              disabled={!sentence.trim() || busy}
              className="learner-button learner-button-primary flex-1 px-6 py-3.5 text-base"
            >
              {loading ? (
                <><WandSparkles className="h-5 w-5 motion-safe:animate-pulse" aria-hidden="true" />กำลังแกะประโยค… · Working on it</>
              ) : (
                <><WandSparkles className="h-5 w-5" aria-hidden="true" />แกะประโยค · Break it down</>
              )}
            </button>
          )}
          {hasResult && (
            <button type="button" onClick={handleReset} className="learner-button learner-button-quiet px-5">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />เริ่มใหม่ · Reset
            </button>
          )}
        </div>
      )}
    </form>
  );
}
