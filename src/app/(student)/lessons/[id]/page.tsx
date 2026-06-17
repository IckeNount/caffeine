"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Tag,
  Clock,
  BarChart3,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Volume2,
  AlertCircle,
  Languages,
} from "lucide-react";
import { publicEnv } from "@/env/public";
import { useLesson } from "@/shared/hooks/useLesson";
import type { LessonSegment } from "@/shared/types/lesson-types";
import type { AnalysisChunk } from "@/features/lingubreak/lib/schema";
import { CHUNK_COLORS } from "@/features/lingubreak/lib/schema";
import InteractiveText from "@/features/lesson-viewer/components/InteractiveText";
import TutorSidebar from "@/features/lesson-viewer/components/TutorSidebar";
import { findBreakdownForSelection } from "@/shared/lib/lessons/grammar-breakdown";

// ── Difficulty Config ────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", labelTh: "เริ่มต้น", color: "#22C55E" },
  intermediate: { label: "Intermediate", labelTh: "กลาง", color: "#F59E0B" },
  advanced: { label: "Advanced", labelTh: "สูง", color: "#EF4444" },
} as const;

// ── Audio Player Hook ────────────────────────────────────────────
function useLessonAudio(audioUrl: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.remove();
    };
  }, [audioUrl]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  return { isPlaying, currentTime, duration, toggle, seekTo, audioRef };
}

// ── Grammar Chunk Display (LinguBreak AnalysisChunk or legacy label chunks) ─
const INLINE_CHUNK_COLORS: Record<
  string,
  { bg: string; accent: string }
> = {
  subject: { bg: "rgba(59,130,246,0.15)", accent: "#60A5FA" },
  verb: { bg: "rgba(255,77,77,0.15)", accent: "#FF6B6B" },
  object: { bg: "rgba(0,229,199,0.15)", accent: "#00E5C7" },
  relative_clause: { bg: "rgba(34,197,94,0.15)", accent: "#4ADE80" },
  prepositional: { bg: "rgba(245,158,11,0.15)", accent: "#FBBF24" },
  modifier: { bg: "rgba(168,85,247,0.15)", accent: "#A855F7" },
};

type LegacyGrammarChunk = {
  text: string;
  label: string;
  color?: string;
  thai?: string;
};

function GrammarChunkTag({
  chunk,
}: {
  chunk: AnalysisChunk | LegacyGrammarChunk;
}) {
  if ("type" in chunk && chunk.type) {
    const colors = INLINE_CHUNK_COLORS[chunk.type] ?? {
      bg: "rgba(200,200,200,0.1)",
      accent: "#999",
    };
    const meta = CHUNK_COLORS[chunk.type];
    return (
      <span
        className="inline-flex flex-col items-center gap-0.5 px-2.5 py-1.5 border-2 border-black text-xs"
        style={{
          backgroundColor: colors.bg,
          boxShadow: "var(--shadow-brutal-sm)",
        }}
      >
        <span className="font-semibold" style={{ color: colors.accent }}>
          {chunk.text}
        </span>
        <span
          className="text-[9px] font-heading uppercase tracking-widest"
          style={{ color: colors.accent }}
        >
          {meta?.label ?? chunk.type}
        </span>
        {chunk.thai_explanation && (
          <span
            className="text-[10px] font-sarabun"
            style={{ color: "var(--text-muted)" }}
          >
            {chunk.thai_explanation}
          </span>
        )}
      </span>
    );
  }

  const legacy = chunk as LegacyGrammarChunk;
  return (
    <span
      className="inline-flex flex-col items-center gap-0.5 px-2.5 py-1.5 border-2 border-black text-xs"
      style={{
        backgroundColor: (legacy.color ?? "var(--accent-gold)") + "20",
        boxShadow: "var(--shadow-brutal-sm)",
      }}
    >
      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
        {legacy.text}
      </span>
      <span
        className="text-[9px] font-heading uppercase tracking-widest"
        style={{ color: legacy.color ?? "var(--accent-gold)" }}
      >
        {legacy.label}
      </span>
      {legacy.thai && (
        <span
          className="text-[10px] font-sarabun"
          style={{ color: "var(--text-muted)" }}
        >
          {legacy.thai}
        </span>
      )}
    </span>
  );
}

// ── Segment Card ─────────────────────────────────────────────────
const SegmentCard = React.memo(function SegmentCard({
  segment,
  index,
  isActive,
  onPlaySegment,
  hasAudio,
  onWordClick,
  onSentenceSelect,
}: {
  segment: LessonSegment;
  index: number;
  isActive: boolean;
  onPlaySegment: (start: number) => void;
  hasAudio: boolean;
  onWordClick: (word: string) => void;
  onSentenceSelect: (sentence: string) => void;
}) {
  const [showGrammar, setShowGrammar] = useState(false);
  const breakdown = segment.grammar_breakdown;
  const hasGrammar =
    breakdown &&
    (Boolean(breakdown.chunks?.length) ||
      Boolean(breakdown.notes) ||
      Boolean(breakdown.pedagogical_steps?.length));

  return (
    <div
      className="brutal-card p-5 sm:p-6 transition-all duration-200"
      style={{
        borderColor: isActive ? "var(--accent-gold)" : "var(--border-brutal)",
        boxShadow: isActive
          ? "4px 4px 0px var(--accent-gold), 0 0 20px -5px rgba(255,229,0,0.2)"
          : "var(--shadow-brutal)",
      }}
    >
      {/* Segment Number + Audio Button */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-heading uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Segment {index + 1}
        </span>
        {hasAudio && segment.audio_start != null && (
          <button
            className="flex items-center gap-1 text-[10px] font-heading uppercase tracking-wider px-2 py-1 border border-black/30 hover:border-black transition-colors"
            style={{
              color: isActive ? "var(--accent-gold)" : "var(--text-muted)",
              backgroundColor: "var(--bg-primary)",
            }}
            onClick={() => onPlaySegment(segment.audio_start!)}
            title="Play this segment"
          >
            {isActive ? (
              <Volume2 className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {formatTime(segment.audio_start)} – {formatTime(segment.audio_end ?? 0)}
          </button>
        )}
      </div>

      {/* Original Text — Interactive */}
      <p className="text-base sm:text-lg leading-relaxed font-medium mb-2">
        <InteractiveText
          text={segment.original_text}
          onWordClick={onWordClick}
          onSentenceSelect={onSentenceSelect}
        />
      </p>

      {/* Thai Translation */}
      {segment.thai_translation && (
        <div className="flex items-start gap-2 mb-3">
          <Languages
            className="w-4 h-4 mt-0.5 shrink-0"
            style={{ color: "var(--accent-teal)" }}
          />
          <p
            className="text-sm font-sarabun leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {segment.thai_translation}
          </p>
        </div>
      )}

      {/* Grammar Breakdown Toggle */}
      {hasGrammar && (
        <>
          <button
            className="flex items-center gap-1.5 text-[11px] font-heading uppercase tracking-wider mt-2 hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent-gold)" }}
            onClick={() => setShowGrammar(!showGrammar)}
          >
            {showGrammar ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Grammar Breakdown
          </button>

          {showGrammar && (
            <div className="mt-3 pt-3 border-t border-white/5 animate-fade-in-up">
              {/* Chunks */}
              {breakdown.chunks && breakdown.chunks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {breakdown.chunks.map((chunk, i) => (
                    <GrammarChunkTag key={i} chunk={chunk} />
                  ))}
                </div>
              )}
              {/* Notes */}
              {breakdown.notes && (
                <p
                  className="text-xs leading-relaxed mt-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {breakdown.notes}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

// ── Time Formatter ───────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Audio Player Bar ─────────────────────────────────────────────
function AudioPlayerBar({
  isPlaying,
  currentTime,
  duration,
  onToggle,
}: {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="brutal-card p-4 flex items-center gap-4"
      style={{ boxShadow: "var(--shadow-brutal-lg)" }}
    >
      <button
        className="w-10 h-10 flex items-center justify-center border-2 border-black shrink-0 transition-transform hover:scale-105"
        style={{
          backgroundColor: "var(--accent-gold)",
          boxShadow: "var(--shadow-brutal-sm)",
        }}
        onClick={onToggle}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-black" />
        ) : (
          <Play className="w-5 h-5 text-black" />
        )}
      </button>

      {/* Progress bar */}
      <div className="flex-1">
        <div
          className="h-2 border border-black/30 relative overflow-hidden"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              backgroundColor: "var(--accent-gold)",
            }}
          />
        </div>
      </div>

      <span
        className="text-xs font-mono shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="skeleton h-8 w-2/3 rounded" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-20 rounded" />
        <div className="skeleton h-6 w-20 rounded" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="brutal-card p-6" style={{ opacity: 0.6 }}>
          <div className="skeleton h-4 w-20 rounded mb-3" />
          <div className="skeleton h-5 w-full rounded mb-2" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────
export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const { lesson, isLoading, error, refetch } = useLesson(lessonId);

  // Interactive text state for AI tutor
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);

  const handleWordClick = useCallback((word: string) => {
    setSelectedWord(word);
  }, []);

  const handleSentenceSelect = useCallback((sentence: string) => {
    setSelectedSentence(sentence);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedWord(null);
    setSelectedSentence(null);
  }, []);

  const precomputedBreakdown = useMemo(
    () => findBreakdownForSelection(lesson?.segments ?? [], selectedSentence),
    [lesson?.segments, selectedSentence],
  );

  // Build audio URL from Supabase storage path
  const audioUrl = lesson?.audio_path
    ? `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${lesson.audio_path}`
    : null;

  const { isPlaying, currentTime, duration, toggle, seekTo } =
    useLessonAudio(audioUrl);

  // Determine which segment is currently active based on audio time
  const segments = lesson?.segments ?? [];
  const activeSegmentIndex = segments.findIndex(
    (seg) =>
      seg.audio_start != null &&
      seg.audio_end != null &&
      currentTime >= seg.audio_start &&
      currentTime < seg.audio_end,
  );

  const publishedDate = lesson?.published_at
    ? new Date(lesson.published_at).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: "var(--bg-card)",
          borderBottom: "3px solid var(--border-brutal)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/lessons"
            className="flex items-center gap-2 text-sm font-heading uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Lessons</span>
          </Link>
          <div
            className="w-px h-6"
            style={{ backgroundColor: "var(--border-subtle)" }}
          />
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center border-2 border-black"
              style={{
                backgroundColor: "var(--accent-gold)",
                boxShadow: "var(--shadow-brutal-sm)",
              }}
            >
              <BookOpen className="w-4.5 h-4.5 text-black" />
            </div>
            <span
              className="font-heading text-sm font-bold tracking-tight uppercase truncate max-w-[200px] sm:max-w-none"
              style={{ color: "var(--text-primary)" }}
            >
              {lesson?.title ?? "Loading..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main — Lesson content */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-40">
        <div className="max-w-7xl mx-auto">
        {/* Lesson Content */}
        {isLoading ? (
          <DetailSkeleton />
        ) : error ? (
          <div className="brutal-card p-8 text-center flex flex-col items-center gap-4">
            <AlertCircle
              className="w-10 h-10"
              style={{ color: "var(--accent-coral)" }}
            />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {error}
            </p>
            <button
              className="brutal-btn brutal-btn-primary px-5 py-2 text-sm"
              onClick={refetch}
            >
              Try Again
            </button>
          </div>
        ) : lesson ? (
          <div className="space-y-8 animate-slam-in">
            {/* Lesson Header */}
            <section className="space-y-4">
              {/* Folder + Difficulty */}
              <div className="flex flex-wrap items-center gap-3">
                {lesson.folder && (
                  <span className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider">
                    <div
                      className="w-3 h-3 border-2 border-black"
                      style={{
                        backgroundColor: lesson.folder.color ?? "#3B82F6",
                      }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>
                      {lesson.folder.name}
                    </span>
                  </span>
                )}
                {lesson.difficulty && (
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-wider px-2.5 py-1 border-2 border-black"
                    style={{
                      backgroundColor:
                        (DIFFICULTY_CONFIG[lesson.difficulty]?.color ?? "#22C55E") + "18",
                      color: DIFFICULTY_CONFIG[lesson.difficulty]?.color ?? "#22C55E",
                      boxShadow: "var(--shadow-brutal-sm)",
                    }}
                  >
                    <BarChart3 className="w-3 h-3" />
                    {DIFFICULTY_CONFIG[lesson.difficulty]?.label ?? lesson.difficulty}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight leading-tight">
                {lesson.title}
              </h1>

              {/* Meta Row */}
              <div
                className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {segments.length} segments
                </span>
                {publishedDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {publishedDate}
                  </span>
                )}
              </div>

              {/* Tags */}
              {Array.isArray(lesson.tags) && lesson.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lesson.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-heading uppercase tracking-wider px-2 py-0.5 border border-black/30"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Tag className="w-2.5 h-2.5 inline mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Audio Player */}
            {audioUrl && (
              <AudioPlayerBar
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onToggle={toggle}
              />
            )}

            {/* Segments */}
            <section className="space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Lesson Content
              </h2>
              <div className="space-y-4 stagger-children">
                {segments.map((segment, i) => (
                  <SegmentCard
                    key={segment.id}
                    segment={segment}
                    index={i}
                    isActive={i === activeSegmentIndex}
                    onPlaySegment={seekTo}
                    hasAudio={!!audioUrl}
                    onWordClick={handleWordClick}
                    onSentenceSelect={handleSentenceSelect}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : null}
        </div>
      </main>

      {/* Bottom-fixed AI Tutor: Dictionary / Breakdown / Notes */}
      {lesson && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 sm:px-6 pb-4 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="h-80">
              <TutorSidebar
                selectedWord={selectedWord}
                selectedSentence={selectedSentence}
                precomputedBreakdown={precomputedBreakdown}
                grammarNotes={lesson.grammar_notes || []}
                onClear={handleClearSelection}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: "3px solid var(--border-brutal)",
          backgroundColor: "var(--bg-card)",
        }}
        className="py-6"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-xs font-heading uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Caffeine — AI English Learning Tools
          </p>
          <p
            className="text-xs font-sarabun"
            style={{ color: "var(--text-muted)" }}
          >
            สร้างด้วย ❤️ เพื่อนักเรียนไทย
          </p>
        </div>
      </footer>
    </div>
  );
}
