"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";

const STAGE_TIMINGS = [0, 1_200, 3_000, 6_000];
const PROGRESS_VALUES = [18, 42, 68, 88];

const COPY = {
  single: [
    ["เตรียมประโยคของคุณ", "Preparing your sentence"],
    ["มองหาส่วนสำคัญ", "Finding the main idea"],
    ["จัดคำอธิบายให้อ่านง่าย", "Making it easier to understand"],
    ["เตรียมคำแปลและบทเรียน", "Preparing your translation and lesson"],
  ],
  batch: [
    ["จัดประโยคที่ตรวจแล้ว", "Organizing your reviewed sentences"],
    ["ดูว่าส่วนไหนพร้อมอยู่แล้ว", "Checking what is already ready"],
    ["แกะทุกประโยคพร้อมกัน", "Breaking everything down together"],
    ["เตรียมคำอธิบายให้เลือกดู", "Preparing your ready breakdowns"],
  ],
} as const;

interface AnalysisProgressProps {
  variant: keyof typeof COPY;
}

export default function AnalysisProgress({ variant }: AnalysisProgressProps) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const update = () => {
      const elapsed = Date.now() - startedAt;
      const next = STAGE_TIMINGS.reduce(
        (current, timing, index) => (elapsed >= timing ? index : current),
        0,
      );
      setActiveStage(next);
    };
    update();
    const interval = window.setInterval(update, 300);
    return () => window.clearInterval(interval);
  }, [variant]);

  const activeCopy = COPY[variant][activeStage];

  return (
    <div
      className="rounded-2xl border border-[var(--border-subtle)] bg-white/80 p-4 shadow-sm sm:p-5"
      aria-label="Analysis progress"
      aria-busy="true"
    >
      <div className="h-2 overflow-hidden rounded-full bg-[#F1EBDD]" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[#D69A17] transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${PROGRESS_VALUES[activeStage]}%` }}
        />
      </div>

      <ol className="mt-4 space-y-3">
        {COPY[variant].map(([thai, english], index) => {
          const complete = index < activeStage;
          const active = index === activeStage;
          return (
            <li
              key={english}
              aria-current={active ? "step" : undefined}
              className={`flex items-start gap-3 ${
                index > activeStage ? "opacity-45" : "opacity-100"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  complete
                    ? "bg-[#26866B] text-white"
                    : active
                      ? "bg-[#FFF0C7] text-[#936C08]"
                      : "border border-[#D9D0BE] bg-white"
                }`}
                aria-hidden="true"
              >
                {complete ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <Sparkles className="h-4 w-4 motion-safe:animate-pulse" />
                ) : null}
              </span>
              <span className="leading-snug">
                <span lang="th" className="block font-thai text-sm font-semibold text-[var(--text-primary)]">
                  {thai}
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">{english}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <span className="sr-only" role="status" aria-live="polite">
        {activeCopy[0]} · {activeCopy[1]}
      </span>
    </div>
  );
}
