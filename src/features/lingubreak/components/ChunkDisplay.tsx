"use client";

import { useState } from "react";
import { Brackets, ChevronRight } from "lucide-react";
import type { AnalysisChunk } from "@/features/lingubreak/lib/schema";
import { CHUNK_COLORS } from "@/features/lingubreak/lib/schema";

interface ChunkDisplayProps {
  chunks: AnalysisChunk[];
}

export default function ChunkDisplay({ chunks }: ChunkDisplayProps) {
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null);
  const selected = selectedChunk === null ? null : chunks[selectedChunk];

  return (
    <section className="learner-card p-5 sm:p-7" aria-labelledby="grammar-title">
      <div className="flex items-start gap-3">
        <span className="section-icon section-icon-coral" aria-hidden="true">
          <Brackets className="h-5 w-5" />
        </span>
        <div>
          <h2 id="grammar-title" className="section-heading">
            ประโยคนี้ทำงานอย่างไร
          </h2>
          <p className="section-subtitle">แตะส่วนประโยคเพื่อดูไวยากรณ์</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {chunks.map((chunk, index) => {
          const colors = CHUNK_COLORS[chunk.type];
          const isSelected = selectedChunk === index;
          return (
            <button
              key={`${chunk.text}-${index}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedChunk(isSelected ? null : index)}
              className={`chunk-button ${colors.bg} ${colors.text} ${colors.border}`}
            >
              <span>{chunk.text}</span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${isSelected ? "rotate-90" : ""}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[#FFFCF4] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${CHUNK_COLORS[selected.type].bg} ${CHUNK_COLORS[selected.type].text} ${CHUNK_COLORS[selected.type].border}`}>
              {CHUNK_COLORS[selected.type].label}
            </span>
            <span lang="th" className="font-thai text-sm font-semibold text-[var(--text-secondary)]">
              {CHUNK_COLORS[selected.type].labelThai}
            </span>
          </div>
          <p lang="th" className="thai-reading mt-4">
            {selected.thai_explanation}
          </p>
          <p lang="en" className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            {selected.explanation}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--border-subtle)] pt-4">
        {Object.entries(CHUNK_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className={`h-3 w-3 rounded-sm border ${colors.bg} ${colors.border}`} aria-hidden="true" />
            <span lang="th" className="font-thai">{colors.labelThai}</span>
            <span aria-hidden="true">·</span>
            <span>{colors.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
