"use client";

import React, { useState } from "react";
import { AnalysisChunk, CHUNK_COLORS } from "@/features/lingubreak/lib/schema";
import { Info, X } from "lucide-react";

interface ChunkDisplayProps {
  chunks: AnalysisChunk[];
  title: string;
  titleIcon?: React.ReactNode;
}

export default function ChunkDisplay({
  chunks,
  title,
  titleIcon,
}: ChunkDisplayProps) {
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="section-title flex items-center gap-2">
        {titleIcon}
        {title}
      </h3>

      <div className="flex flex-wrap gap-2">
        {chunks.map((chunk, index) => {
          const colors = CHUNK_COLORS[chunk.type];
          const isSelected = selectedChunk === index;

          return (
            <button
              key={index}
              onClick={() => setSelectedChunk(isSelected ? null : index)}
              className={`
                brutal-tag px-3 py-2 text-sm select-none
                ${colors.bg} ${colors.text} ${colors.border} border-3
                ${isSelected ? "translate-x-[-2px] translate-y-[-2px]" : ""}
              `}
              style={{
                boxShadow: isSelected
                  ? 'var(--shadow-brutal), 0 0 12px rgba(255, 229, 0, 0.4)'
                  : 'var(--shadow-brutal-sm)',
              }}
            >
              <span>{chunk.text}</span>
              <Info className="w-3.5 h-3.5 opacity-50" />
            </button>
          );
        })}
      </div>

      {/* Explanation Tooltip */}
      {selectedChunk !== null && chunks[selectedChunk] && (
        <div
          className="relative mt-2 p-4 animate-slam-in"
          style={{
            backgroundColor: 'var(--bg-card-hover)',
            border: '3px solid var(--border-brutal)',
            boxShadow: 'var(--shadow-brutal)',
          }}
        >
          <button
            onClick={() => setSelectedChunk(null)}
            className="absolute top-3 right-3 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-coral)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2 py-0.5 text-xs font-bold uppercase border-2 border-black ${CHUNK_COLORS[chunks[selectedChunk].type].bg} ${CHUNK_COLORS[chunks[selectedChunk].type].text}`}
              >
                {CHUNK_COLORS[chunks[selectedChunk].type].label}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {CHUNK_COLORS[chunks[selectedChunk].type].labelThai}
              </span>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {chunks[selectedChunk].explanation}
            </p>

            <p className="text-sm leading-relaxed font-sarabun" style={{ color: 'var(--text-muted)' }}>
              🇹🇭 {chunks[selectedChunk].thai_explanation}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3"
        style={{ borderTop: '2px solid var(--border-subtle)' }}
      >
        {Object.entries(CHUNK_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className={`inline-block w-3 h-3 border-2 border-black ${colors.bg}`}
            />
            <span className="text-xs font-heading uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {colors.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
