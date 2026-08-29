"use client";

import { useEffect, useMemo } from "react";
import { AlertCircle, Check, Sparkles } from "lucide-react";
import AnalysisProgress from "@/features/lingubreak/components/AnalysisProgress";
import { useBatchAnalyze } from "@/features/lingubreak/hooks/useBatchAnalyze";
import {
  estimateBatchText,
  normalizeBatchSentences,
} from "@/features/lingubreak/lib/batch-schema";
import type { AnalysisResult } from "@/features/lingubreak/lib/schema";

interface OcrBatchAnalysisProps {
  variant?: "ocr" | "reading";
  sentences: string[];
  reviewedText: string;
  onReady: (sentence: string, result: AnalysisResult) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export default function OcrBatchAnalysis({
  variant = "ocr",
  sentences,
  reviewedText,
  onReady,
  onLoadingChange,
}: OcrBatchAnalysisProps) {
  const { response, analyzedText, loading, error, analyze } = useBatchAnalyze();
  const validation = useMemo(() => {
    try {
      return { sentences: normalizeBatchSentences(sentences), error: null };
    } catch (caught) {
      return {
        sentences: [],
        error:
          caught instanceof Error
            ? caught.message
            : "Please review 1–10 sentences at a time.",
      };
    }
  }, [sentences]);
  const estimate = estimateBatchText(validation.sentences);
  const stale = response !== null && analyzedText !== reviewedText;
  const reading = variant === "reading";

  useEffect(() => {
    onLoadingChange?.(loading);
    return () => onLoadingChange?.(false);
  }, [loading, onLoadingChange]);

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[#FFFCF5] p-4">
      <div>
        <p lang="th" className="font-thai text-base font-semibold text-[var(--text-primary)]">
          {reading ? "พร้อมเรียนจากทุกประโยค" : "พร้อมแกะทุกประโยคในครั้งเดียว"}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {reading
            ? "Read the paragraph first. Nothing starts until you choose the button below."
            : "Review the text above first. Nothing starts until you choose the button below."}
        </p>
      </div>

      {validation.error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-[var(--accent-coral)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          โปรดตรวจ 1–10 ประโยค · {validation.error}
        </p>
      ) : (
        <div className="rounded-xl bg-white p-3 text-sm text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">
            การใช้ AI โดยประมาณ · Estimated AI use: {estimate.level}
          </p>
          <p className="mt-1">
            {estimate.sentenceCount} of 10 sentences · about {estimate.textTokens} learner-text tokens · 1 batch request
          </p>
          <p lang="th" className="mt-1 font-thai text-xs">
            เป็นค่าประมาณจากข้อความของผู้เรียน ไม่ใช่เครดิต Gemini ที่เหลือ
          </p>
          <p className="text-xs">This is a text-size estimate, not your remaining Gemini credit.</p>
        </div>
      )}

      <button
        type="button"
        disabled={loading || validation.sentences.length === 0}
        onClick={() => void analyze(validation.sentences, reviewedText)}
        className="learner-button learner-button-primary w-full px-4 py-3"
      >
        <Sparkles className="h-5 w-5 motion-safe:animate-pulse" aria-hidden="true" />
        {reading ? "พร้อมเรียนแล้ว" : "ตรวจข้อความแล้ว"} · Break down all sentences
      </button>

      {loading && <AnalysisProgress variant="batch" />}
      {error && (
        <p role="alert" className="text-sm text-[var(--accent-coral)]">
          {error}
        </p>
      )}

      {stale && (
        <div role="alert" className="rounded-xl bg-[#FFF1E8] p-3 text-sm text-[var(--text-secondary)]">
          <p lang="th" className="font-thai font-semibold text-[var(--text-primary)]">
            {reading
              ? "บทอ่านเปลี่ยนแล้ว กรุณาแกะประโยคใหม่"
              : "ข้อความเปลี่ยนแล้ว กรุณาแกะประโยคใหม่"}
          </p>
          <p className="mt-1">
            The ready breakdowns are outdated because the {reading ? "reading" : "reviewed text"} changed.
          </p>
        </div>
      )}

      {response && !stale && (
        <div className="space-y-3">
          <div className="rounded-xl bg-[#EAF8F3] p-3 text-sm text-[var(--text-secondary)]">
            {response.usage.generatedSentences === 0 ? (
              <p>
                ไม่ต้องใช้ AI เพิ่ม · No new AI generation was needed — every sentence was already ready.
              </p>
            ) : (
              <p>
                การใช้ AI จริง · Actual AI use: {response.usage.generatedSentences} new · {response.usage.cachedSentences} already ready
                {response.usage.totalTokens === null
                  ? ""
                  : ` · ${response.usage.totalTokens} total tokens`}
              </p>
            )}
          </div>

          <div>
            <p lang="th" className="font-thai text-base font-semibold">เลือกประโยคที่พร้อมแล้ว</p>
            <p className="text-sm text-[var(--text-secondary)]">Choose a ready sentence to view its breakdown instantly.</p>
          </div>

          <div className="grid gap-2">
            {response.items.map((item, index) => (
              <button
                key={item.sentence}
                type="button"
                onClick={() => onReady(item.sentence, item.result)}
                className="sentence-choice items-start text-left"
              >
                <span className="sentence-number">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-relaxed sm:text-base">{item.sentence}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#26715F]">
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />พร้อมแล้ว · Ready
                    </span>
                    <span>ดูคำอธิบาย · View breakdown</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
