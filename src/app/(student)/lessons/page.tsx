"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowLeft,
  Layers,
  Clock,
  Tag,
  AlertCircle,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { useLessons } from "@/shared/hooks/useLessons";
import type { Lesson } from "@/shared/types/lesson-types";

// ── Difficulty Badge ─────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", labelTh: "เริ่มต้น", color: "#22C55E" },
  intermediate: { label: "Intermediate", labelTh: "กลาง", color: "#F59E0B" },
  advanced: { label: "Advanced", labelTh: "สูง", color: "#EF4444" },
} as const;

function DifficultyBadge({ level }: { level: string }) {
  const config =
    DIFFICULTY_CONFIG[level as keyof typeof DIFFICULTY_CONFIG] ??
    DIFFICULTY_CONFIG.beginner;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-wider px-2.5 py-1 border-2 border-black"
      style={{
        backgroundColor: config.color + "18",
        color: config.color,
        boxShadow: "var(--shadow-brutal-sm)",
      }}
    >
      <BarChart3 className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ── Lesson Card ──────────────────────────────────────────────────
function LessonCard({ lesson }: { lesson: Lesson }) {
  const segmentCount = lesson.segments?.[0]?.count ?? 0;
  const publishedDate = lesson.published_at
    ? new Date(lesson.published_at).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className="brutal-card p-5 sm:p-6 flex flex-col gap-4 transition-transform hover:-translate-y-1 hover:shadow-lg group"
    >
      {/* Top row: folder color bar + difficulty */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {lesson.folder && (
            <div
              className="w-3 h-3 border-2 border-black"
              style={{ backgroundColor: lesson.folder.color ?? "#3B82F6" }}
              title={lesson.folder.name}
            />
          )}
          {lesson.folder && (
            <span
              className="text-[11px] font-heading uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {lesson.folder.name}
            </span>
          )}
        </div>
        {lesson.difficulty && <DifficultyBadge level={lesson.difficulty} />}
      </div>

      {/* Title */}
      <h3 className="font-heading text-lg font-bold uppercase tracking-tight leading-snug">
        {lesson.title}
      </h3>

      {/* Meta row */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          {segmentCount} {segmentCount === 1 ? "segment" : "segments"}
        </span>
        {publishedDate && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {publishedDate}
          </span>
        )}
      </div>

      {/* Tags */}
      {lesson.tags && lesson.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lesson.tags.slice(0, 4).map((tag) => (
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

      {/* CTA */}
      <div
        className="flex items-center gap-1 text-sm font-heading uppercase tracking-wider group-hover:gap-2 transition-all mt-auto pt-2"
        style={{ color: "var(--accent-gold)" }}
      >
        Start Lesson <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────
function LessonSkeleton() {
  return (
    <div className="brutal-card p-6 flex flex-col gap-4" style={{ opacity: 0.6 }}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-5 w-24 rounded" />
      </div>
      <div className="skeleton h-6 w-3/4 rounded" />
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="flex gap-2">
        <div className="skeleton h-4 w-14 rounded" />
        <div className="skeleton h-4 w-14 rounded" />
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      className="brutal-card p-10 sm:p-16 text-center flex flex-col items-center gap-4"
      style={{ borderStyle: "dashed" }}
    >
      <div
        className="w-16 h-16 flex items-center justify-center border-2 border-black"
        style={{
          backgroundColor: "var(--accent-gold)",
          boxShadow: "var(--shadow-brutal)",
        }}
      >
        <BookOpen className="w-8 h-8 text-black" />
      </div>
      <h3 className="font-heading text-xl font-bold uppercase tracking-tight">
        No Lessons Yet
      </h3>
      <p
        className="text-sm max-w-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Lessons will appear here once your teacher publishes them.
      </p>
      <p
        className="text-xs font-sarabun"
        style={{ color: "var(--text-muted)" }}
      >
        ยังไม่มีบทเรียนในตอนนี้ — รอครูเผยแพร่บทเรียนก่อนนะ
      </p>
    </div>
  );
}

// ── Error State ──────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="brutal-card p-8 text-center flex flex-col items-center gap-4">
      <AlertCircle className="w-10 h-10" style={{ color: "var(--accent-coral)" }} />
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>
      <button
        className="brutal-btn brutal-btn-primary px-5 py-2 text-sm"
        onClick={onRetry}
      >
        Try Again
      </button>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────
export default function LessonsPage() {
  const [folderId, setFolderId] = useState<string | undefined>();
  const { lessons, total, isLoading, error, refetch } = useLessons({
    folder_id: folderId,
    limit: 50,
  });

  // Extract unique folders from loaded lessons for filter tabs
  const folders = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    lessons.forEach((l) => {
      if (l.folder) {
        map.set(l.folder.id, {
          id: l.folder.id,
          name: l.folder.name,
          color: l.folder.color ?? "#3B82F6",
        });
      }
    });
    return Array.from(map.values());
  }, [lessons]);

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-heading uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
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
            <span className="font-heading text-base font-bold tracking-tight uppercase">
              <span className="rov-text">Lessons</span>
            </span>
          </div>
          {!isLoading && (
            <span
              className="ml-auto text-xs font-heading uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {total} {total === 1 ? "lesson" : "lessons"}
            </span>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Folder Filter Tabs */}
        {folders.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-fade-in-up">
            <button
              className={`text-xs font-heading uppercase tracking-wider px-3 py-1.5 border-2 border-black transition-all ${
                !folderId ? "brutal-btn-primary" : ""
              }`}
              style={{
                backgroundColor: !folderId
                  ? "var(--accent-gold)"
                  : "var(--bg-card)",
                color: !folderId ? "#000" : "var(--text-muted)",
                boxShadow: !folderId
                  ? "var(--shadow-brutal-sm)"
                  : "none",
              }}
              onClick={() => setFolderId(undefined)}
            >
              All
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                className="text-xs font-heading uppercase tracking-wider px-3 py-1.5 border-2 border-black transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor:
                    folderId === folder.id
                      ? folder.color + "30"
                      : "var(--bg-card)",
                  color:
                    folderId === folder.id
                      ? folder.color
                      : "var(--text-muted)",
                  boxShadow:
                    folderId === folder.id
                      ? "var(--shadow-brutal-sm)"
                      : "none",
                }}
                onClick={() => setFolderId(folder.id)}
              >
                <div
                  className="w-2 h-2 border border-black/40"
                  style={{ backgroundColor: folder.color }}
                />
                {folder.name}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {Array.from({ length: 6 }).map((_, i) => (
              <LessonSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : lessons.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "3px solid var(--border-brutal)",
          backgroundColor: "var(--bg-card)",
        }}
        className="py-6"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
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
