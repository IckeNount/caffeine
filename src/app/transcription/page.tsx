"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, History } from "lucide-react";
import {
  AudioUploader,
  TranscriptionResult as TranscriptionResultDisplay,
  TranscriptionHistory,
  useTranscription,
} from "@/features/transcription";
import type { TranscriptionModel } from "@/shared/lib/transcription";

export default function TranscriptionPage() {
  const router = useRouter();
  const [model, setModel] = useState<TranscriptionModel>("whisper-large-v3-turbo");
  const { result, isLoading, error, uploadAndTranscribe, reset } =
    useTranscription();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  // Loaded transcription from history
  const [loadedAudioUrl, setLoadedAudioUrl] = useState<string | null>(null);
  const [loadedResult, setLoadedResult] = useState<{
    text: string;
    segments: { id: number; start: number; end: number; text: string }[];
    duration: number;
    language: string;
    model: TranscriptionModel;
    processingTimeMs: number;
    savedId?: string;
  } | null>(null);

  // Create blob URL for audio playback (from fresh upload)
  const audioUrl = useMemo(() => {
    if (!audioFile) return null;
    return URL.createObjectURL(audioFile);
  }, [audioFile]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Refresh history when a new transcription is saved
  useEffect(() => {
    if (result?.savedId) {
      setHistoryRefreshKey((k) => k + 1);
    }
  }, [result?.savedId]);

  const handleFileSelected = (file: File) => {
    setLoadedResult(null);
    setLoadedAudioUrl(null);
    setAudioFile(file);
    uploadAndTranscribe(file, model);
  };

  const handleSendToLinguBreak = (text: string) => {
    const encoded = encodeURIComponent(text.trim());
    router.push(`/lingubreak?text=${encoded}`);
  };

  const handleModelToggle = () => {
    if (!isLoading) {
      setModel((prev) =>
        prev === "whisper-large-v3-turbo"
          ? "whisper-large-v3"
          : "whisper-large-v3-turbo"
      );
    }
  };

  const handleLoadFromHistory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/transcriptions/${id}`);
      if (!res.ok) return;
      const data = await res.json();

      setLoadedResult({
        text: data.edited_text || data.original_text,
        segments: data.segments || [],
        duration: data.duration || 0,
        language: data.language || "en",
        model: data.model as TranscriptionModel,
        processingTimeMs: data.processing_ms || 0,
        savedId: data.id,
      });
      setLoadedAudioUrl(data.audioUrl || null);
      setAudioFile(null);
      reset();
      setShowHistory(false);
    } catch (err) {
      console.error("[Load History Error]", err);
    }
  }, [reset]);

  const handleStartOver = () => {
    reset();
    setAudioFile(null);
    setLoadedResult(null);
    setLoadedAudioUrl(null);
  };

  // Active result: either fresh transcription or loaded from history
  const activeResult = result || loadedResult;
  const activeAudioUrl = audioUrl || loadedAudioUrl;

  const modelLabel =
    model === "whisper-large-v3-turbo"
      ? "Whisper Turbo (fast)"
      : "Whisper v3 (high accuracy)";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: "var(--bg-card)",
          borderBottom: "3px solid var(--border-brutal)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center border-2 border-black"
              style={{
                backgroundColor: "var(--accent-gold)",
                boxShadow: "var(--shadow-brutal-sm)",
              }}
            >
              <Mic className="w-4 h-4 text-black" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight uppercase">
              <span className="rov-text">Audio</span>{" "}
              <span style={{ color: "var(--text-primary)" }}>Transcription</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider px-3 py-1.5 border-2 border-black transition-colors"
              style={{
                color: showHistory ? "black" : "var(--text-secondary)",
                background: showHistory ? "var(--accent-gold)" : "var(--bg-primary)",
                boxShadow: "var(--shadow-brutal-sm)",
              }}
              id="toggle-history"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
            <Link
              href="/"
              className="text-xs font-heading uppercase tracking-wider px-3 py-1.5 border-2 border-black hover:bg-[var(--bg-card-hover)] transition-colors"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg-primary)",
                boxShadow: "var(--shadow-brutal-sm)",
              }}
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <section className="text-center space-y-3 animate-slam-in">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase">
            <span className="rov-text">Transcribe</span>{" "}
            <span style={{ color: "var(--text-primary)" }}>
              Audio to Text
            </span>
          </h1>
          <p
            className="text-sm sm:text-base max-w-xl mx-auto font-sarabun leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            อัปโหลดไฟล์เสียงภาษาอังกฤษ แล้วระบบจะถอดเสียงเป็นข้อความให้ทันที
            <br />
            <span style={{ color: "var(--text-muted)" }}>
              Upload an English audio file → transcribed instantly by Groq Whisper
            </span>
          </p>
        </section>

        {/* History Panel */}
        {showHistory && (
          <section
            className="brutal-card p-5 sm:p-6 animate-slam-in"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="section-title mb-3">📂 Transcription History</div>
            <TranscriptionHistory
              onSelect={handleLoadFromHistory}
              refreshKey={historyRefreshKey}
            />
          </section>
        )}

        {/* Upload Card */}
        {!activeResult && (
          <section
            className="brutal-card p-5 sm:p-6 rov-glow animate-slam-in"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="section-title">🎵 Upload audio file</div>

              {/* Model toggle */}
              <label
                className="flex items-center gap-2 cursor-pointer select-none group"
                id="transcription-model-toggle"
              >
                <div
                  className="relative w-9 h-5 rounded-none transition-colors"
                  style={{
                    border: "2px solid var(--border-brutal)",
                    background:
                      model === "whisper-large-v3"
                        ? "var(--accent-purple)"
                        : "var(--bg-primary)",
                    boxShadow: "var(--shadow-brutal-sm)",
                  }}
                  onClick={handleModelToggle}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 transition-all duration-150"
                    style={{
                      background:
                        model === "whisper-large-v3"
                          ? "#fff"
                          : "var(--text-muted)",
                      border: "1px solid var(--border-brutal)",
                      left: model === "whisper-large-v3" ? "18px" : "2px",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-heading uppercase tracking-wider"
                  style={{
                    color:
                      model === "whisper-large-v3"
                        ? "var(--accent-purple)"
                        : "var(--text-muted)",
                  }}
                  onClick={handleModelToggle}
                >
                  🎯 High Accuracy
                </span>
              </label>
            </div>

            {/* Model info badge */}
            <div
              className="text-xs font-sarabun px-3 py-1.5 mb-4 inline-block"
              style={{
                border: `2px solid ${model === "whisper-large-v3" ? "var(--accent-purple)" : "var(--accent-gold)"}`,
                color:
                  model === "whisper-large-v3"
                    ? "var(--accent-purple)"
                    : "var(--accent-gold)",
                background: "var(--bg-primary)",
              }}
              id="transcription-model-badge"
            >
              {model === "whisper-large-v3-turbo"
                ? "⚡ Turbo — fast transcription, great accuracy"
                : "🎯 Whisper v3 — maximum accuracy, slightly slower"}
            </div>

            <AudioUploader
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              disabled={!!activeResult}
            />
          </section>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="brutal-card p-6 text-center space-y-3 animate-slam-in">
            <div className="flex justify-center">
              <div
                className="w-10 h-10 flex items-center justify-center text-lg animate-float"
                style={{
                  border: "3px solid var(--border-brutal)",
                  background: "var(--accent-gold)",
                  boxShadow: "var(--shadow-brutal-sm)",
                }}
              >
                🎙️
              </div>
            </div>
            <p
              className="text-sm font-heading uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Transcribing with {modelLabel}…
            </p>
            <div className="skeleton h-2 w-48 mx-auto" />
            <p
              className="text-xs font-sarabun"
              style={{ color: "var(--text-muted)" }}
            >
              กำลังถอดเสียง โปรดรอสักครู่...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="p-4 text-sm font-medium animate-slam-in"
            style={{
              backgroundColor: "rgba(255, 77, 77, 0.15)",
              border: "3px solid var(--accent-coral)",
              color: "var(--accent-coral)",
              boxShadow: "var(--shadow-brutal-sm)",
            }}
          >
            ⚠️ {error}
            <button
              onClick={handleStartOver}
              className="ml-3 underline text-xs uppercase tracking-wider"
            >
              Try again
            </button>
          </div>
        )}

        {/* Result */}
        {activeResult && !isLoading && (
          <section
            className="brutal-card p-5 sm:p-6 animate-slam-in"
            style={{
              borderColor: "var(--accent-gold)",
              boxShadow:
                "var(--shadow-brutal), 0 0 20px -5px rgba(255, 229, 0, 0.15)",
            }}
          >
            <TranscriptionResultDisplay
              result={activeResult}
              audioUrl={activeAudioUrl || undefined}
              onSendToLinguBreak={handleSendToLinguBreak}
              onStartOver={handleStartOver}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "3px solid var(--border-brutal)",
          backgroundColor: "var(--bg-card)",
        }}
        className="py-6"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-xs font-heading uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Transcription — {modelLabel} · Powered by Groq
          </p>
          <p
            className="text-xs font-sarabun"
            style={{ color: "var(--text-muted)" }}
          >
            ส่วนหนึ่งของ Caffaine · Demo / Test Page
          </p>
        </div>
      </footer>
    </div>
  );
}
