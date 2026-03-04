"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AnalysisChunk, CHUNK_COLORS } from "@/features/lingubreak/lib/schema";
import { Play, RotateCcw } from "lucide-react";

interface ReconstructionViewProps {
  englishChunks: AnalysisChunk[];
  thaiChunks: AnalysisChunk[];
}

export default function ReconstructionView({
  englishChunks,
  thaiChunks,
}: ReconstructionViewProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showThai, setShowThai] = useState(false);
  const [displayChunks, setDisplayChunks] = useState(englishChunks);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setShowThai(false);
    setDisplayChunks(englishChunks);

    // After a brief pause, switch to Thai order with animation
    setTimeout(() => {
      setShowThai(true);
      setDisplayChunks(thaiChunks);
    }, 800);

    // End animation state
    setTimeout(() => {
      setIsAnimating(false);
    }, 1600);
  }, [englishChunks, thaiChunks]);

  const reset = useCallback(() => {
    setShowThai(false);
    setDisplayChunks(englishChunks);
    setIsAnimating(false);
  }, [englishChunks]);

  useEffect(() => {
    setDisplayChunks(englishChunks);
    setShowThai(false);
  }, [englishChunks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title flex items-center gap-2">
          ✨ Reconstruction
        </h3>
        <div className="flex gap-2">
          <button
            onClick={startAnimation}
            disabled={isAnimating}
            className="brutal-btn brutal-btn-primary px-3 py-1.5 text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            Play
          </button>
          {showThai && (
            <button
              onClick={reset}
              className="brutal-btn brutal-btn-secondary px-3 py-1.5 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Status Label */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 border-2 border-black transition-colors duration-500"
          style={{ backgroundColor: showThai ? 'var(--accent-teal)' : 'var(--accent-blue)' }}
        />
        <span className="text-xs font-heading uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {showThai ? "🇹🇭 Thai Grammar Order" : "🇺🇸 English Grammar Order"}
        </span>
      </div>

      {/* Animated Chunks Container */}
      <div
        className="relative min-h-[60px] p-4 overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '3px solid var(--border-brutal)',
          boxShadow: 'var(--shadow-brutal-sm)',
        }}
      >
        <div className="flex flex-wrap gap-2">
          {displayChunks.map((chunk, i) => {
            const colors = CHUNK_COLORS[chunk.type];
            return (
              <span
                key={`${showThai ? "th" : "en"}-${i}`}
                className={`
                  inline-flex items-center px-3 py-1.5 border-3 text-sm font-bold
                  ${colors.bg} ${colors.text} ${colors.border}
                  transition-all duration-500 ease-out
                  ${isAnimating ? "animate-pulse" : ""}
                `}
                style={{
                  boxShadow: 'var(--shadow-brutal-sm)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {chunk.text}
              </span>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-center italic font-heading uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Click &quot;Play&quot; to see the sentence restructure from English → Thai order
      </p>
    </div>
  );
}
