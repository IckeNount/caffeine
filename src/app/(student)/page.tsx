"use client";

import { useState } from "react";
import { AlertCircle, Brackets, Sparkles } from "lucide-react";
import ChunkDisplay from "@/features/lingubreak/components/ChunkDisplay";
import ComparisonView from "@/features/lingubreak/components/ComparisonView";
import ModelSwitcher from "@/features/lingubreak/components/ModelSwitcher";
import ReconstructionView from "@/features/lingubreak/components/ReconstructionView";
import SentenceInput from "@/features/lingubreak/components/SentenceInput";
import StepAccordion from "@/features/lingubreak/components/StepAccordion";
import { useAnalyze } from "@/features/lingubreak/hooks/useAnalyze";
import {
  DEFAULT_AI_PROVIDER,
  type AIProvider,
} from "@/features/lingubreak/lib/providers";

export default function Home() {
  const [provider, setProvider] = useState<AIProvider>(DEFAULT_AI_PROVIDER);
  const { result, loading, error, analyze, reset } = useAnalyze();

  return (
    <div className="min-h-screen flex flex-col">
      <header
        style={{
          backgroundColor: "var(--bg-card)",
          borderBottom: "3px solid var(--border-brutal)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div
            className="w-9 h-9 flex items-center justify-center border-2 border-black"
            style={{
              backgroundColor: "var(--accent-gold)",
              boxShadow: "var(--shadow-brutal-sm)",
            }}
          >
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="font-heading text-base font-bold tracking-tight uppercase">
              <span className="rov-text">Caff</span>
              <span style={{ color: "var(--text-primary)" }}>eine</span>
            </p>
            <p
              className="text-xs font-sarabun"
              style={{ color: "var(--text-muted)" }}
            >
              เข้าใจประโยคอังกฤษแบบคนไทย
            </p>
          </div>
          <div className="ml-auto">
            <ModelSwitcher
              provider={provider}
              onChange={setProvider}
              disabled={loading}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <section className="text-center space-y-3 animate-slam-in">
          <p
            className="font-heading text-xs uppercase tracking-[0.25em]"
            style={{ color: "var(--accent-gold)" }}
          >
            LinguBreak
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight uppercase">
            Break down English.
            <br />
            <span className="rov-text">Rebuild it in Thai logic.</span>
          </h1>
          <p
            className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Find the sentence core, understand every chunk, and see how the
            meaning flows naturally for Thai learners.
          </p>
        </section>

        <section className="brutal-card p-5 sm:p-7">
          <SentenceInput
            onAnalyze={(sentence) => analyze(sentence, provider)}
            onReset={reset}
            loading={loading}
            hasResult={result !== null}
          />
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4"
            style={{
              backgroundColor: "rgba(255, 77, 77, 0.12)",
              border: "3px solid var(--accent-coral)",
              boxShadow: "var(--shadow-brutal-sm)",
            }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "var(--accent-coral)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {error}
            </p>
          </div>
        )}

        {result && (
          <section className="space-y-6 animate-slam-in">
            <div className="brutal-card p-5 sm:p-7">
              <ChunkDisplay
                chunks={result.chunks}
                title="Sentence Chunks"
                titleIcon={<Brackets className="w-5 h-5" />}
              />
            </div>

            <div className="brutal-card p-5 sm:p-7">
              <ComparisonView
                englishChunks={result.chunks}
                thaiChunks={result.thai_reordered_chunks}
                simplifiedEnglish={result.simplified_english}
                thaiTranslation={result.thai_translation}
              />
            </div>

            <div className="brutal-card p-5 sm:p-7">
              <ReconstructionView
                englishChunks={result.chunks}
                thaiChunks={result.thai_reordered_chunks}
              />
            </div>

            <StepAccordion steps={result.pedagogical_steps} />
          </section>
        )}
      </main>

      <footer
        className="py-6"
        style={{
          borderTop: "3px solid var(--border-brutal)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <p
          className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs font-sarabun"
          style={{ color: "var(--text-muted)" }}
        >
          วิเคราะห์โครงสร้างภาษาอังกฤษ พร้อมคำอธิบายภาษาไทย
        </p>
      </footer>
    </div>
  );
}
