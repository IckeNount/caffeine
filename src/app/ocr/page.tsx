"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { ImageUploader, TextEditor, useOcr } from "@/features/ocr";
import type { OcrProvider } from "@/shared/lib/ocr";

export default function OcrPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<OcrProvider>("tesseract");
  const { result, isLoading, error, progress, uploadAndExtract, reset } =
    useOcr(provider);

  const handleSendToLinguBreak = (text: string) => {
    const encoded = encodeURIComponent(text.trim());
    router.push(`/lingubreak?text=${encoded}`);
  };

  const handleProviderToggle = () => {
    if (!isLoading) {
      setProvider((prev) => (prev === "tesseract" ? "gemini" : "tesseract"));
    }
  };

  const providerLabel =
    provider === "tesseract"
      ? "Tesseract (free, client-side)"
      : "Gemini Vision (uses API quota)";

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
                backgroundColor: "var(--accent-coral)",
                boxShadow: "var(--shadow-brutal-sm)",
              }}
            >
              <Camera className="w-4 h-4 text-black" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight uppercase">
              <span className="rov-text">OCR</span>{" "}
              <span style={{ color: "var(--text-primary)" }}>Reader</span>
            </span>
          </div>
          <a
            href="/"
            className="text-xs font-heading uppercase tracking-wider px-3 py-1.5 border-2 border-black hover:bg-[var(--bg-card-hover)] transition-colors"
            style={{
              color: "var(--text-secondary)",
              background: "var(--bg-primary)",
              boxShadow: "var(--shadow-brutal-sm)",
            }}
          >
            ← Home
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <section className="text-center space-y-3 animate-slam-in">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase">
            <span className="rov-text">Extract</span>{" "}
            <span style={{ color: "var(--text-primary)" }}>
              Text from Images
            </span>
          </h1>
          <p
            className="text-sm sm:text-base max-w-xl mx-auto font-sarabun leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            อัปโหลดรูปภาพข้อความภาษาอังกฤษ แล้วระบบจะแปลงเป็นข้อความให้ทันที
            <br />
            <span style={{ color: "var(--text-muted)" }}>
              Upload a photo of English text → extracted instantly
            </span>
          </p>
        </section>

        {/* Upload Card */}
        <section
          className="brutal-card p-5 sm:p-6 rov-glow animate-slam-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="section-title">📤 Upload an image</div>

            {/* ── Provider toggle ─────────────────────────────────── */}
            <label
              className="flex items-center gap-2 cursor-pointer select-none group"
              id="ocr-provider-toggle"
            >
              <div
                className="relative w-9 h-5 rounded-none transition-colors"
                style={{
                  border: "2px solid var(--border-brutal)",
                  background:
                    provider === "gemini"
                      ? "var(--accent-purple)"
                      : "var(--bg-primary)",
                  boxShadow: "var(--shadow-brutal-sm)",
                }}
                onClick={handleProviderToggle}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 transition-all duration-150"
                  style={{
                    background:
                      provider === "gemini"
                        ? "#fff"
                        : "var(--text-muted)",
                    border: "1px solid var(--border-brutal)",
                    left: provider === "gemini" ? "18px" : "2px",
                  }}
                />
              </div>
              <span
                className="text-xs font-heading uppercase tracking-wider"
                style={{
                  color:
                    provider === "gemini"
                      ? "var(--accent-purple)"
                      : "var(--text-muted)",
                }}
                onClick={handleProviderToggle}
              >
                ✨ Gemini AI
              </span>
            </label>
          </div>

          {/* Provider info badge */}
          <div
            className="text-xs font-sarabun px-3 py-1.5 mb-4 inline-block"
            style={{
              border: `2px solid ${provider === "gemini" ? "var(--accent-purple)" : "var(--accent-teal)"}`,
              color:
                provider === "gemini"
                  ? "var(--accent-purple)"
                  : "var(--accent-teal)",
              background: "var(--bg-primary)",
            }}
            id="ocr-provider-badge"
          >
            {provider === "tesseract"
              ? "🆓 Free — runs in your browser, no API key needed"
              : "✨ Gemini Vision — higher accuracy, uses API quota"}
          </div>

          <ImageUploader
            onFileSelected={uploadAndExtract}
            isLoading={isLoading}
            disabled={!!result}
          />
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="brutal-card p-6 text-center space-y-3 animate-slam-in">
            <div className="flex justify-center">
              <div
                className="w-10 h-10 flex items-center justify-center text-lg animate-float"
                style={{
                  border: "3px solid var(--border-brutal)",
                  background:
                    provider === "gemini"
                      ? "var(--accent-purple)"
                      : "var(--accent-teal)",
                  boxShadow: "var(--shadow-brutal-sm)",
                }}
              >
                🔍
              </div>
            </div>
            <p
              className="text-sm font-heading uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              {provider === "tesseract"
                ? "Extracting with Tesseract.js…"
                : "Extracting with Gemini Vision…"}
            </p>
            {/* Progress bar for Tesseract */}
            {provider === "tesseract" && progress !== null ? (
              <div
                className="h-2 w-48 mx-auto overflow-hidden"
                style={{
                  border: "2px solid var(--border-brutal)",
                  background: "var(--bg-primary)",
                }}
              >
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                    background: "var(--accent-teal)",
                  }}
                />
              </div>
            ) : (
              <div className="skeleton h-2 w-48 mx-auto" />
            )}
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
              onClick={reset}
              className="ml-3 underline text-xs uppercase tracking-wider"
            >
              Try again
            </button>
          </div>
        )}

        {/* Result Editor */}
        {result && !isLoading && (
          <section
            className="brutal-card p-5 sm:p-6 animate-slam-in"
            style={{
              borderColor: "var(--accent-teal)",
              boxShadow:
                "var(--shadow-brutal), 0 0 20px -5px rgba(0, 229, 199, 0.15)",
            }}
          >
            <TextEditor
              text={result.text}
              confidence={result.confidence}
              processingTimeMs={result.processingTimeMs}
              onSendToLinguBreak={handleSendToLinguBreak}
              onStartOver={reset}
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
            OCR Reader — {providerLabel}
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
