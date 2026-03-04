"use client";

import { useEffect, useRef } from "react";
import { Play, Pause, SkipBack } from "lucide-react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import type { TranscriptionSegment } from "@/shared/lib/transcription";

interface SubtitlePlayerProps {
  /** Audio source URL (blob URL or remote URL). */
  audioUrl: string;
  /** Timestamped segments from transcription. */
  segments: TranscriptionSegment[];
}

export default function SubtitlePlayer({
  audioUrl,
  segments,
}: SubtitlePlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    activeSegmentIndex,
    togglePlay,
    seek,
    setAudioSrc,
    isReady,
  } = useAudioPlayer(segments);

  const segmentListRef = useRef<HTMLDivElement>(null);
  const activeSegRef = useRef<HTMLDivElement>(null);

  // Set audio source when URL changes
  useEffect(() => {
    if (audioUrl) {
      setAudioSrc(audioUrl);
    }
  }, [audioUrl, setAudioSrc]);

  // Auto-scroll active segment into view
  useEffect(() => {
    if (activeSegRef.current && segmentListRef.current) {
      activeSegRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSegmentIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="section-title">🎧 Audio Player & Subtitles</div>

      {/* Audio controls */}
      <div
        className="p-4 space-y-3"
        style={{
          border: "3px solid var(--border-brutal)",
          background: "var(--bg-primary)",
          boxShadow: "var(--shadow-brutal-sm)",
        }}
      >
        {/* Play/Pause + time */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className="w-10 h-10 flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40"
            style={{
              border: "3px solid var(--border-brutal)",
              background: isPlaying ? "var(--accent-coral)" : "var(--accent-gold)",
              boxShadow: "var(--shadow-brutal-sm)",
            }}
            id="subtitle-play-pause"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-black ml-0.5" />
            )}
          </button>

          <button
            onClick={() => seek(0)}
            disabled={!isReady}
            className="w-8 h-8 flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40"
            style={{
              border: "2px solid var(--border-brutal)",
              background: "var(--bg-card)",
            }}
            id="subtitle-restart"
          >
            <SkipBack className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </button>

          <div className="flex-1">
            {/* Progress bar */}
            <div
              className="relative h-3 cursor-pointer group"
              style={{
                border: "2px solid var(--border-brutal)",
                background: "var(--bg-card)",
              }}
              onClick={(e) => {
                if (!isReady || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = x / rect.width;
                seek(pct * duration);
              }}
              id="subtitle-progress-bar"
            >
              <div
                className="absolute top-0 left-0 h-full transition-[width] duration-75"
                style={{
                  width: `${progressPercent}%`,
                  background: "var(--accent-gold)",
                }}
              />
              {/* Playhead */}
              <div
                className="absolute top-[-3px] w-2 h-[calc(100%+6px)] transition-[left] duration-75"
                style={{
                  left: `calc(${progressPercent}% - 4px)`,
                  background: "var(--text-primary)",
                  border: "1px solid var(--border-brutal)",
                }}
              />
            </div>
          </div>

          <span
            className="text-xs font-mono tabular-nums shrink-0"
            style={{ color: "var(--text-muted)", minWidth: "5rem", textAlign: "right" }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Subtitle segments */}
      {segments.length > 0 && (
        <div
          ref={segmentListRef}
          className="max-h-64 overflow-y-auto space-y-0.5 p-3"
          style={{
            border: "3px solid var(--border-brutal)",
            background: "var(--bg-primary)",
            boxShadow: "var(--shadow-brutal-sm)",
          }}
          id="subtitle-segment-list"
        >
          {segments.map((seg, idx) => {
            const isActive = idx === activeSegmentIndex;
            return (
              <div
                key={seg.id}
                ref={isActive ? activeSegRef : undefined}
                onClick={() => seek(seg.start)}
                className="flex gap-3 px-2.5 py-1.5 cursor-pointer transition-all duration-150 hover:opacity-80"
                style={{
                  background: isActive
                    ? "rgba(255, 229, 0, 0.15)"
                    : "transparent",
                  borderLeft: isActive
                    ? "3px solid var(--accent-gold)"
                    : "3px solid transparent",
                  ...(isActive
                    ? { boxShadow: "inset 0 0 12px -4px rgba(255, 229, 0, 0.1)" }
                    : {}),
                }}
              >
                <span
                  className="text-xs font-mono shrink-0 tabular-nums pt-0.5"
                  style={{
                    color: isActive ? "var(--accent-gold)" : "var(--text-muted)",
                    minWidth: "3rem",
                  }}
                >
                  {formatTime(seg.start)}
                </span>
                <span
                  className="text-sm font-sarabun leading-relaxed"
                  style={{
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {seg.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
