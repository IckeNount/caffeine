"use client";

import { AlertCircle, ArrowDown, Sparkles } from "lucide-react";
import { WordLookup } from "@/features/dictionary";
import ChunkDisplay from "@/features/lingubreak/components/ChunkDisplay";
import AnalysisProgress from "@/features/lingubreak/components/AnalysisProgress";
import OrderComparison from "@/features/lingubreak/components/OrderComparison";
import SentenceInput from "@/features/lingubreak/components/SentenceInput";
import StepAccordion from "@/features/lingubreak/components/StepAccordion";
import TranslationHero from "@/features/lingubreak/components/TranslationHero";
import { useAnalyze } from "@/features/lingubreak/hooks/useAnalyze";
import { DEFAULT_AI_PROVIDER } from "@/features/lingubreak/lib/providers";

export default function Home() {
  const { result, loading, error, analyze, showResult, reset } = useAnalyze();

  return (
    <div className="min-h-screen">
      <header className="app-header sticky top-0 z-20">
        <div className="mx-auto flex h-[4.5rem] max-w-[960px] items-center gap-3 px-4 sm:px-6">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold leading-tight">Caffeine</p>
            <p lang="th" className="font-thai text-xs text-[var(--text-secondary)]">
              อังกฤษเข้าใจง่าย สำหรับคนไทย
            </p>
          </div>
          <span className="ml-auto rounded-full bg-white px-3 py-1.5 font-thai text-xs font-semibold text-[var(--text-secondary)] shadow-sm">
            สำหรับผู้เรียนไทย
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[960px] px-4 py-8 sm:px-6 sm:py-12">
        <section className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <p className="eyebrow text-[#936C08]">LINGUBREAK</p>
          <h1 lang="th" className="mt-3 font-heading text-3xl font-semibold leading-[1.4] text-[var(--text-primary)] sm:text-5xl">
            แกะประโยคอังกฤษ
            <span className="block text-[#B47700]">ให้เข้าใจแบบคนไทย</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            Choose a sentence. See the Thai meaning, tap unfamiliar words, and learn how every part works.
          </p>
        </section>

        <section className="learner-card learner-card-accent mt-8 p-5 pt-7 sm:p-7 sm:pt-9">
          <SentenceInput
            onAnalyze={(sentence) => analyze(sentence, DEFAULT_AI_PROVIDER)}
            onReadyAnalysis={(_sentence, readyResult) => showResult(readyResult)}
            onReset={reset}
            loading={loading}
            hasResult={result !== null}
          />
        </section>

        {loading && (
          <div className="mt-6">
            <AnalysisProgress variant="single" />
          </div>
        )}

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-[rgba(232,93,93,0.35)] bg-[#FFF4F2] p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-coral)]" aria-hidden="true" />
            <div>
              <p lang="th" className="font-thai text-base font-semibold">ยังวิเคราะห์ประโยคนี้ไม่ได้</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <section className="mt-8 space-y-5 animate-fade-in-up" aria-label="Sentence analysis result">
            <div className="flex items-center justify-center gap-2 pb-1 text-sm font-semibold text-[var(--text-secondary)]">
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
              <span lang="th" className="font-thai">เริ่มเรียนจากความหมายก่อน</span>
            </div>
            <TranslationHero
              thaiTranslation={result.thai_translation}
              simplifiedEnglish={result.simplified_english}
            />
            <WordLookup chunks={result.chunks} />
            <ChunkDisplay chunks={result.chunks} />
            <OrderComparison
              englishChunks={result.chunks}
              thaiChunks={result.thai_reordered_chunks}
            />
            <StepAccordion steps={result.pedagogical_steps} />
          </section>
        )}
      </main>

      <footer className="mt-12 border-t border-[var(--border-subtle)] bg-white/45 py-7">
        <p lang="th" className="mx-auto max-w-[960px] px-4 text-center font-thai text-sm text-[var(--text-secondary)] sm:px-6">
          อ่านความหมาย • แตะคำศัพท์ • เข้าใจไวยากรณ์
        </p>
      </footer>
    </div>
  );
}
