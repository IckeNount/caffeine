"use client";

import React from "react";
import { AnalysisChunk, CHUNK_COLORS } from "@/features/lingubreak/lib/schema";
import { Swords } from "lucide-react";

interface ComparisonViewProps {
  englishChunks: AnalysisChunk[];
  thaiChunks: AnalysisChunk[];
  simplifiedEnglish: string;
  thaiTranslation: string;
}

export default function ComparisonView({
  englishChunks,
  thaiChunks,
  simplifiedEnglish,
  thaiTranslation,
}: ComparisonViewProps) {
  return (
    <div className="space-y-4">
      <h3 className="section-title flex items-center gap-2">
        ⚔️ English vs Thai Logic
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* English Logic Panel */}
        <div
          className="p-4"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '3px solid var(--border-brutal)',
            boxShadow: 'var(--shadow-brutal-sm)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🇺🇸</span>
            <h4 className="text-sm font-bold font-heading uppercase tracking-wide" style={{ color: 'var(--accent-blue)' }}>
              English Logic
            </h4>
          </div>

          {/* Core Sentence */}
          <div
            className="mb-3 px-3 py-2"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '2px solid var(--border-subtle)',
            }}
          >
            <p className="text-xs uppercase tracking-wider font-heading" style={{ color: 'var(--text-muted)' }}>
              Core SVO
            </p>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
              {simplifiedEnglish}
            </p>
          </div>

          {/* Chunks */}
          <div className="flex flex-wrap gap-1.5">
            {englishChunks.map((chunk, i) => {
              const colors = CHUNK_COLORS[chunk.type];
              return (
                <span
                  key={i}
                  className={`inline-block px-2.5 py-1 border-2 text-xs font-bold ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {chunk.text}
                </span>
              );
            })}
          </div>
        </div>

        {/* VS Badge (desktop) */}
        <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div
            className="w-12 h-12 flex items-center justify-center border-3 border-black font-heading font-bold text-black"
            style={{
              backgroundColor: 'var(--accent-gold)',
              boxShadow: 'var(--shadow-brutal-sm)',
              transform: 'rotate(5deg)',
            }}
          >
            <Swords className="w-5 h-5" />
          </div>
        </div>

        {/* Thai Logic Panel */}
        <div
          className="p-4"
          style={{
            backgroundColor: 'rgba(0, 229, 199, 0.08)',
            border: '3px solid var(--border-brutal)',
            boxShadow: 'var(--shadow-brutal-sm)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🇹🇭</span>
            <h4 className="text-sm font-bold font-heading uppercase tracking-wide" style={{ color: 'var(--accent-teal)' }}>
              Thai Logic <span className="font-sarabun normal-case" style={{ color: 'var(--text-muted)' }}>(ตรรกะไทย)</span>
            </h4>
          </div>

          {/* Thai Translation */}
          <div
            className="mb-3 px-3 py-2"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '2px solid var(--border-subtle)',
            }}
          >
            <p className="text-xs uppercase tracking-wider font-heading" style={{ color: 'var(--text-muted)' }}>
              Thai Translation
            </p>
            <p className="text-sm font-medium font-sarabun mt-1" style={{ color: 'var(--text-secondary)' }}>
              {thaiTranslation}
            </p>
          </div>

          {/* Reordered Chunks */}
          <div className="flex flex-wrap gap-1.5">
            {thaiChunks.map((chunk, i) => {
              const colors = CHUNK_COLORS[chunk.type];
              return (
                <span
                  key={i}
                  className={`inline-block px-2.5 py-1 border-2 text-xs font-bold ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {chunk.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
