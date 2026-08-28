import { ArrowDown, Route } from "lucide-react";
import type { AnalysisChunk } from "@/features/lingubreak/lib/schema";
import { CHUNK_COLORS } from "@/features/lingubreak/lib/schema";

interface OrderComparisonProps {
  englishChunks: AnalysisChunk[];
  thaiChunks: AnalysisChunk[];
}

function ChunkRow({ chunks }: { chunks: AnalysisChunk[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chunks.map((chunk, index) => {
        const colors = CHUNK_COLORS[chunk.type];
        return (
          <span
            key={`${chunk.text}-${index}`}
            className={`rounded-xl border px-3 py-2 text-sm font-bold leading-relaxed ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {chunk.text}
          </span>
        );
      })}
    </div>
  );
}

export default function OrderComparison({
  englishChunks,
  thaiChunks,
}: OrderComparisonProps) {
  return (
    <section className="learner-card p-5 sm:p-7" aria-labelledby="order-title">
      <div className="flex items-start gap-3">
        <span className="section-icon section-icon-blue" aria-hidden="true">
          <Route className="h-5 w-5" />
        </span>
        <div>
          <h2 id="order-title" className="section-heading">
            ลำดับประโยค
          </h2>
          <p className="section-subtitle">English order → Thai-friendly order</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[#F8FBFF] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="sentence-number">1</span>
          <div>
            <p className="font-heading text-sm font-semibold">English order</p>
            <p className="text-xs text-[var(--text-secondary)]">ลำดับที่เห็นในประโยค</p>
          </div>
        </div>
        <div className="mt-4">
          <ChunkRow chunks={englishChunks} />
        </div>
      </div>

      <div className="flex justify-center py-2 text-[var(--text-secondary)]" aria-hidden="true">
        <ArrowDown className="h-6 w-6" />
      </div>

      <div className="rounded-2xl border border-[rgba(46,196,182,0.28)] bg-[var(--surface-teal)] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="sentence-number bg-[var(--accent-teal)]">2</span>
          <div>
            <p lang="th" className="font-thai text-base font-semibold">อ่านตามลำดับแบบไทย</p>
            <p className="text-xs text-[var(--text-secondary)]">Thai-friendly processing order</p>
          </div>
        </div>
        <div className="mt-4">
          <ChunkRow chunks={thaiChunks} />
        </div>
      </div>
    </section>
  );
}
