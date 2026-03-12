"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Book,
  Languages,
  BookOpen,
  Loader2,
  Volume2,
  Globe,
  X,
  ChevronDown,
} from "lucide-react";
import { useAnalyze } from "@/features/lingubreak/hooks/useAnalyze";
import type { AnalysisResult, AnalysisChunk } from "@/features/lingubreak/lib/schema";
import { CHUNK_COLORS } from "@/features/lingubreak/lib/schema";
import type { DictionaryLookupResult } from "@/features/dictionary/types";
import type { GrammarNote } from "@/shared/types/lesson-types";

// ── Types ────────────────────────────────────────────────────────

type SidebarTab = "dictionary" | "breakdown" | "notes";

interface TutorSidebarProps {
  /** The word to look up (set from single-click) */
  selectedWord: string | null;
  /** The sentence to analyze (set from double-click) */
  selectedSentence: string | null;
  /** Grammar notes from the teacher */
  grammarNotes: GrammarNote[];
  /** Callback to clear selected state */
  onClear: () => void;
}

// ── Styling constants ────────────────────────────────────────────

const CHUNK_INLINE_COLORS: Record<string, { bg: string; text: string }> = {
  subject:         { bg: "rgba(59,130,246,0.15)", text: "#60A5FA" },
  verb:            { bg: "rgba(255,77,77,0.15)",  text: "#FF6B6B" },
  object:          { bg: "rgba(0,229,199,0.15)",  text: "#00E5C7" },
  relative_clause: { bg: "rgba(34,197,94,0.15)",  text: "#4ADE80" },
  prepositional:   { bg: "rgba(245,158,11,0.15)", text: "#FBBF24" },
  modifier:        { bg: "rgba(168,85,247,0.15)", text: "#A855F7" },
};

// ── Component ────────────────────────────────────────────────────

export default function TutorSidebar({
  selectedWord,
  selectedSentence,
  grammarNotes,
  onClear,
}: TutorSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("dictionary");

  // Dictionary state
  const [dictResult, setDictResult] = useState<DictionaryLookupResult | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

  // Sentence analysis
  const { result: analysisResult, loading: analysisLoading, error: analysisError, analyze } = useAnalyze();

  // Dictionary lookup function
  const lookupWord = useCallback(async (word: string) => {
    setDictLoading(true);
    setDictError(null);
    setDictResult(null);
    try {
      const params = new URLSearchParams({ word });
      const res = await fetch(`/api/dictionary?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Not found");
      setDictResult(data.data);
    } catch (err) {
      setDictError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setDictLoading(false);
    }
  }, []);

  // Auto-trigger dictionary lookup when word changes
  useEffect(() => {
    if (selectedWord) {
      setActiveTab("dictionary");
      lookupWord(selectedWord);
    }
  }, [selectedWord, lookupWord]);

  // Auto-trigger sentence analysis when sentence changes
  useEffect(() => {
    if (selectedSentence) {
      setActiveTab("breakdown");
      analyze(selectedSentence, "gemini");
    }
  }, [selectedSentence, analyze]);

  const playAudio = (url: string) => {
    new Audio(url).play().catch(console.error);
  };

  // ── Tab buttons ──────────────────────────────────────────────
  const tabs: { key: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { key: "dictionary", label: "Dictionary", icon: <Book size={14} /> },
    { key: "breakdown", label: "Breakdown", icon: <Languages size={14} /> },
    { key: "notes", label: "Notes", icon: <BookOpen size={14} /> },
  ];

  return (
    <aside
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-secondary, #111217)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Tab Bar */}
      <div
        className="flex border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? "#FFE500" : "var(--text-muted, #6B6F80)",
              borderBottom: activeTab === tab.key ? "2px solid #FFE500" : "2px solid transparent",
              backgroundColor: activeTab === tab.key ? "rgba(255,229,0,0.04)" : "transparent",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ── Dictionary Tab ──────────────────────────────────── */}
        {activeTab === "dictionary" && (
          <div className="space-y-4">
            {dictLoading && (
              <div className="flex flex-col items-center py-8 gap-2">
                <Loader2 size={24} className="animate-spin" style={{ color: "#FFE500" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Looking up &ldquo;{selectedWord}&rdquo;...
                </span>
              </div>
            )}
            {dictError && (
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: "#EF4444" }}>{dictError}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Try clicking another word.
                </p>
              </div>
            )}
            {!dictLoading && !dictError && !dictResult && (
              <div className="text-center py-10">
                <Book size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Click any word in the lesson to look it up
                </p>
              </div>
            )}
            {dictResult && dictResult.entries.map((entry, idx) => {
              const audioPhonetic = entry.phonetics.find((p) => p.audio && p.audio.length > 0);
              const textPhonetic = entry.phonetics.find((p) => p.text) || { text: "" };
              const thai = dictResult.thai;

              return (
                <div key={idx} className="space-y-4">
                  {/* Word header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className="text-2xl font-bold capitalize tracking-tight"
                        style={{ color: "var(--text-primary, #F1F1F3)" }}
                      >
                        {entry.word}
                      </h3>
                      {textPhonetic.text && (
                        <p className="text-sm mt-0.5" style={{ color: "#818CF8" }}>
                          {textPhonetic.text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {audioPhonetic?.audio && (
                        <button
                          onClick={() => playAudio(audioPhonetic.audio!)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5"
                          style={{ color: "#818CF8" }}
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                      <button onClick={onClear} className="p-1 rounded hover:bg-white/5">
                        <X size={14} style={{ color: "var(--text-muted)" }} />
                      </button>
                    </div>
                  </div>

                  {/* Thai translation */}
                  {thai?.wordThai && (
                    <div className="flex items-center gap-1.5">
                      <Globe size={14} style={{ color: "#22C55E" }} />
                      <span className="text-lg font-semibold" style={{ color: "#22C55E" }}>
                        {thai.wordThai}
                      </span>
                    </div>
                  )}

                  {/* Meanings */}
                  {entry.meanings.map((meaning, mIdx) => {
                    const thaiMeaning = thai?.meanings?.[mIdx];
                    return (
                      <div key={mIdx} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-semibold italic px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: "rgba(129,140,248,0.1)", color: "#818CF8" }}
                          >
                            {meaning.partOfSpeech}
                          </span>
                          {thaiMeaning?.partOfSpeechThai && (
                            <span className="text-xs" style={{ color: "#22C55E" }}>
                              {thaiMeaning.partOfSpeechThai}
                            </span>
                          )}
                        </div>
                        {meaning.definitions.slice(0, 3).map((def, dIdx) => {
                          const thaiDef = thaiMeaning?.definitionsThai?.[dIdx];
                          return (
                            <div key={dIdx} className="pl-3" style={{ borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
                              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                                {def.definition}
                              </p>
                              {thaiDef && (
                                <p className="text-xs mt-0.5" style={{ color: "#4ADE80" }}>
                                  🇹🇭 {thaiDef}
                                </p>
                              )}
                              {def.example && (
                                <p className="text-xs mt-1 italic" style={{ color: "var(--text-muted)" }}>
                                  &ldquo;{def.example}&rdquo;
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Breakdown Tab ───────────────────────────────────── */}
        {activeTab === "breakdown" && (
          <div className="space-y-4">
            {analysisLoading && (
              <div className="flex flex-col items-center py-8 gap-2">
                <Loader2 size={24} className="animate-spin" style={{ color: "#8B5CF6" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Analyzing sentence...
                </span>
              </div>
            )}
            {analysisError && (
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: "#EF4444" }}>{analysisError}</p>
              </div>
            )}
            {!analysisLoading && !analysisError && !analysisResult && (
              <div className="text-center py-10">
                <Languages size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Double-click any word to analyze its sentence
                </p>
              </div>
            )}
            {analysisResult && (
              <SentenceBreakdown
                result={analysisResult}
                sentence={selectedSentence || ""}
                onClear={onClear}
              />
            )}
          </div>
        )}

        {/* ── Notes Tab ───────────────────────────────────────── */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            {grammarNotes.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No grammar notes for this lesson
                </p>
              </div>
            ) : (
              grammarNotes.map((note, i) => (
                <GrammarNoteCard key={i} note={note} />
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SentenceBreakdown({
  result,
  sentence,
  onClear,
}: {
  result: AnalysisResult;
  sentence: string;
  onClear: () => void;
}) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Sentence Analysis
        </h3>
        <button onClick={onClear} className="p-1 rounded hover:bg-white/5">
          <X size={14} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Original sentence */}
      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
        &ldquo;{sentence}&rdquo;
      </p>

      {/* Colored chunks */}
      <div className="flex flex-wrap gap-1.5">
        {result.chunks.map((chunk: AnalysisChunk, i: number) => {
          const colors = CHUNK_INLINE_COLORS[chunk.type] || { bg: "rgba(200,200,200,0.1)", text: "#999" };
          return (
            <span
              key={i}
              className="inline-flex flex-col items-center px-2 py-1 rounded-md"
              style={{ backgroundColor: colors.bg }}
            >
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                {chunk.text}
              </span>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: colors.text, opacity: 0.7 }}>
                {CHUNK_COLORS[chunk.type]?.labelThai || chunk.type}
              </span>
            </span>
          );
        })}
      </div>

      {/* Simplified + Thai */}
      <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
            Simplified
          </span>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>
            {result.simplified_english}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
            Thai Translation
          </span>
          <p className="text-sm mt-0.5" style={{ color: "#22C55E" }}>
            {result.thai_translation}
          </p>
        </div>
      </div>

      {/* Pedagogical steps (collapsible) */}
      {result.pedagogical_steps?.length > 0 && (
        <div>
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#FFE500" }}
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${showSteps ? "rotate-180" : ""}`}
            />
            {showSteps ? "Hide" : "Show"} learning steps ({result.pedagogical_steps.length})
          </button>
          {showSteps && (
            <div className="mt-2 space-y-2">
              {result.pedagogical_steps.map((step) => (
                <div
                  key={step.step_number}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(255,229,0,0.04)", border: "1px solid rgba(255,229,0,0.1)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: "rgba(255,229,0,0.15)", color: "#FFE500" }}
                    >
                      {step.step_number}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {step.title}
                    </span>
                  </div>
                  <p className="text-xs ml-7" style={{ color: "var(--text-muted)" }}>
                    {step.description}
                  </p>
                  <p className="text-xs ml-7 mt-0.5" style={{ color: "#4ADE80" }}>
                    {step.description_thai}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GrammarNoteCard({ note }: { note: GrammarNote }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          <BookOpen size={14} style={{ color: "#22C55E" }} />
          {note.title}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--text-muted)" }}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            {note.content}
          </p>
        </div>
      )}
    </div>
  );
}
