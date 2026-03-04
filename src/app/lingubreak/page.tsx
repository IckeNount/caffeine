"use client";

import React, { useState, useEffect } from "react";
import { Crosshair } from "lucide-react";
import SentenceInput from "@/features/lingubreak/components/SentenceInput";
import ChunkDisplay from "@/features/lingubreak/components/ChunkDisplay";
import StepAccordion from "@/features/lingubreak/components/StepAccordion";
import ComparisonView from "@/features/lingubreak/components/ComparisonView";
import ReconstructionView from "@/features/lingubreak/components/ReconstructionView";
import ModelSwitcher from "@/features/lingubreak/components/ModelSwitcher";
import { useAnalyze } from "@/features/lingubreak/hooks/useAnalyze";
import { AIProvider, PROVIDERS } from "@/features/lingubreak/lib/ai-providers";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-slam-in">
      <div className="brutal-card p-6 space-y-4">
        <div className="skeleton h-4 w-32" />
        <div className="flex flex-wrap gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-10" style={{ width: `${60 + Math.random() * 80}px` }} />
          ))}
        </div>
      </div>
      <div className="brutal-card p-6 space-y-3">
        <div className="skeleton h-4 w-40" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { result, loading, error, analyze, reset } = useAnalyze();
  const [provider, setProvider] = useState<AIProvider>("deepseek");

  // Persist provider selection
  useEffect(() => {
    const saved = localStorage.getItem("lingubreak-provider") as AIProvider | null;
    if (saved && PROVIDERS.some((p) => p.id === saved)) {
      setProvider(saved);
    }
  }, []);

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    localStorage.setItem("lingubreak-provider", p);
  };

  const handleAnalyze = (sentence: string) => {
    analyze(sentence, provider);
  };

  const currentProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — Brutal Top Bar */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderBottom: '3px solid var(--border-brutal)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center border-2 border-black"
              style={{ backgroundColor: 'var(--accent-gold)', boxShadow: 'var(--shadow-brutal-sm)' }}
            >
              <Crosshair className="w-4.5 h-4.5 text-black" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight uppercase">
              <span className="rov-text">Lingu</span>
              <span style={{ color: 'var(--text-primary)' }}>Break</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ModelSwitcher
              provider={provider}
              onChange={handleProviderChange}
              disabled={loading}
            />
            <span className="text-xs font-sarabun hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              เครื่องมือแยกประโยคภาษาอังกฤษ
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <section className="text-center space-y-4 animate-slam-in">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight uppercase">
            <span className="rov-text">Break Down</span>{" "}
            <span style={{ color: 'var(--text-primary)' }}>English Sentences</span>
          </h1>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Powered by AI, designed for Thai learners.
            <br className="hidden sm:block" />
            <span className="font-sarabun">
              แยกประโยคภาษาอังกฤษที่ซับซ้อน ให้เข้าใจง่ายด้วย &quot;ตรรกะไทย&quot;
            </span>
          </p>
        </section>

        {/* Input Card */}
        <section className="brutal-card p-5 sm:p-6 rov-glow animate-slam-in" style={{ animationDelay: "0.1s" }}>
          <SentenceInput
            onAnalyze={handleAnalyze}
            onReset={reset}
            loading={loading}
            hasResult={!!result}
          />
        </section>

        {/* Error */}
        {error && (
          <div
            className="p-4 border-3 text-sm font-medium animate-slam-in"
            style={{
              backgroundColor: 'rgba(255, 77, 77, 0.15)',
              border: '3px solid var(--accent-coral)',
              color: 'var(--accent-coral)',
              boxShadow: 'var(--shadow-brutal-sm)',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSkeleton />}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6 stagger-children">
            {/* Visual Sentence - English Order */}
            <section className="brutal-card p-5 sm:p-6">
              <ChunkDisplay
                chunks={result.chunks}
                title="Visual Sentence"
                titleIcon={<span>🔤</span>}
              />
            </section>

            {/* 4-Step Breakdown */}
            <section className="brutal-card p-5 sm:p-6">
              <StepAccordion steps={result.pedagogical_steps} />
            </section>

            {/* Comparison View */}
            <section className="brutal-card p-5 sm:p-6 relative">
              <ComparisonView
                englishChunks={result.chunks}
                thaiChunks={result.thai_reordered_chunks}
                simplifiedEnglish={result.simplified_english}
                thaiTranslation={result.thai_translation}
              />
            </section>

            {/* Reconstruction Animation */}
            <section className="brutal-card p-5 sm:p-6">
              <ReconstructionView
                englishChunks={result.chunks}
                thaiChunks={result.thai_reordered_chunks}
              />
            </section>
          </div>
        )}
      </main>

      {/* Footer — Brutal Bottom Bar */}
      <footer style={{ borderTop: '3px solid var(--border-brutal)', backgroundColor: 'var(--bg-card)' }} className="py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-heading uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            LinguBreak — AI Sentence Breakdown
          </p>
          <p className="text-xs font-sarabun" style={{ color: 'var(--text-muted)' }}>
            Powered by {currentProvider.icon} {currentProvider.name} · สร้างด้วย ❤️ เพื่อนักเรียนไทย
          </p>
        </div>
      </footer>
    </div>
  );
}
