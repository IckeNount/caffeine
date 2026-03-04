"use client";

import React from "react";
import Link from "next/link";
import { Crosshair, ScanText, BookOpen, Mic, ArrowRight, Sparkles } from "lucide-react";

const FEATURES = [
  {
    id: "lingubreak",
    name: "LinguBreak",
    nameThai: "แยกประโยค",
    description: "Break down complex English sentences into visual, color-coded structures using Thai logic.",
    icon: <Crosshair className="w-6 h-6" />,
    href: "/lingubreak",
    status: "live" as const,
    color: "var(--accent-gold)",
  },
  {
    id: "ocr",
    name: "OCR Reader",
    nameThai: "อ่านรูปภาพ",
    description: "Upload a photo of English text and instantly extract, analyze, and learn from it.",
    icon: <ScanText className="w-6 h-6" />,
    href: "/ocr",
    status: "coming-soon" as const,
    color: "var(--accent-coral, #FF4D4D)",
  },
  {
    id: "dictionary",
    name: "Click to Lookup",
    nameThai: "คลิกเพื่อค้นหา",
    description: "Click any English word to instantly see its definition, pronunciation, and Thai translation.",
    icon: <BookOpen className="w-6 h-6" />,
    href: "/dictionary",
    status: "coming-soon" as const,
    color: "var(--accent-teal, #00E5C7)",
  },
  {
    id: "transcription",
    name: "Transcription",
    nameThai: "ถอดเสียง",
    description: "Upload an English audio file and get highly accurate text transcription powered by Groq Whisper.",
    icon: <Mic className="w-6 h-6" />,
    href: "/transcription",
    status: "live" as const,
    color: "var(--accent-gold)",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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
              <Sparkles className="w-4.5 h-4.5 text-black" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight uppercase">
              <span className="rov-text">Caff</span>
              <span style={{ color: 'var(--text-primary)' }}>eine</span>
            </span>
          </div>
          <span className="text-xs font-sarabun hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            เครื่องมือเรียนภาษาอังกฤษ
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4 animate-slam-in">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight uppercase">
            <span className="rov-text">Learn English</span>{" "}
            <span style={{ color: 'var(--text-primary)' }}>Smarter</span>
          </h1>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            AI-powered tools designed for Thai learners.
            <br className="hidden sm:block" />
            <span className="font-sarabun">
              ชุดเครื่องมือ AI สำหรับคนไทยที่อยากเก่งอังกฤษ
            </span>
          </p>
        </section>

        {/* Feature Cards */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {FEATURES.map((feature) => (
            <Link
              key={feature.id}
              href={feature.href}
              className="brutal-card p-6 flex flex-col gap-4 transition-transform hover:-translate-y-1 hover:shadow-lg group"
              style={{
                opacity: feature.status === "coming-soon" ? 0.65 : 1,
                pointerEvents: feature.status === "coming-soon" ? "none" : "auto",
              }}
            >
              {/* Icon + Status */}
              <div className="flex items-center justify-between">
                <div
                  className="w-12 h-12 flex items-center justify-center border-2 border-black"
                  style={{ backgroundColor: feature.color, boxShadow: 'var(--shadow-brutal-sm)' }}
                >
                  {feature.icon}
                </div>
                {feature.status === "coming-soon" && (
                  <span
                    className="text-[10px] font-heading uppercase tracking-wider px-2 py-1 border-2 border-black"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}
                  >
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-bold uppercase tracking-tight">
                  {feature.name}
                </h2>
                <p className="text-xs font-sarabun" style={{ color: 'var(--text-muted)' }}>
                  {feature.nameThai}
                </p>
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
                {feature.description}
              </p>

              {/* CTA */}
              {feature.status === "live" && (
                <div className="flex items-center gap-1 text-sm font-heading uppercase tracking-wider group-hover:gap-2 transition-all" style={{ color: feature.color }}>
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Link>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '3px solid var(--border-brutal)', backgroundColor: 'var(--bg-card)' }} className="py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-heading uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Caffeine — AI English Learning Tools
          </p>
          <p className="text-xs font-sarabun" style={{ color: 'var(--text-muted)' }}>
            สร้างด้วย ❤️ เพื่อนักเรียนไทย
          </p>
        </div>
      </footer>
    </div>
  );
}
