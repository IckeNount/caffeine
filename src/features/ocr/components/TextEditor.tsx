"use client";

import { useState, useEffect } from "react";

interface TextEditorProps {
  /** The extracted text from OCR. */
  text: string;
  /** Confidence score (0–1). */
  confidence: number;
  /** Processing time in ms. */
  processingTimeMs: number;
  /** Callback when user wants to send text to LinguBreak. */
  onSendToLinguBreak: (text: string) => void;
  /** Callback to start over (clear everything). */
  onStartOver: () => void;
}

export default function TextEditor({
  text,
  confidence,
  processingTimeMs,
  onSendToLinguBreak,
  onStartOver,
}: TextEditorProps) {
  const [editableText, setEditableText] = useState(text);
  const [copied, setCopied] = useState(false);

  // Sync when new text arrives from OCR
  useEffect(() => {
    setEditableText(text);
  }, [text]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidencePercent >= 90
      ? "var(--accent-teal)"
      : confidencePercent >= 70
        ? "var(--accent-orange)"
        : "var(--accent-coral)";

  return (
    <div className="space-y-4 animate-slam-in">
      {/* ── Metadata bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider px-2.5 py-1"
          style={{
            border: `2px solid ${confidenceColor}`,
            color: confidenceColor,
            background: "var(--bg-card)",
            boxShadow: "var(--shadow-brutal-sm)",
          }}
          id="ocr-confidence-badge"
        >
          <span style={{ fontSize: "10px" }}>●</span>
          {confidencePercent}% confident
        </div>
        <div
          className="text-xs font-heading uppercase tracking-wider px-2.5 py-1"
          style={{
            border: "2px solid var(--border-subtle)",
            color: "var(--text-muted)",
            background: "var(--bg-card)",
            boxShadow: "var(--shadow-brutal-sm)",
          }}
        >
          ⏱ {processingTimeMs < 1000
            ? `${processingTimeMs}ms`
            : `${(processingTimeMs / 1000).toFixed(1)}s`}
        </div>
      </div>

      {/* ── Section label ────────────────────────────────────────── */}
      <div className="section-title">
        📝 Extracted Text — review & edit below
      </div>

      {/* ── Editable textarea ────────────────────────────────────── */}
      <textarea
        value={editableText}
        onChange={(e) => setEditableText(e.target.value)}
        className="brutal-input w-full font-sarabun text-sm leading-relaxed resize-vertical"
        style={{
          minHeight: "160px",
          maxHeight: "400px",
          padding: "1rem",
        }}
        id="ocr-text-editor"
        placeholder="Extracted text will appear here..."
      />

      {/* ── Action buttons ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {/* Send to LinguBreak */}
        <button
          onClick={() => onSendToLinguBreak(editableText)}
          disabled={!editableText.trim()}
          className="brutal-btn brutal-btn-primary px-5 py-2.5 text-sm"
          id="ocr-send-lingubreak-btn"
        >
          🔤 Send to LinguBreak
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          disabled={!editableText.trim()}
          className="brutal-btn brutal-btn-secondary px-4 py-2.5 text-sm"
          id="ocr-copy-btn"
        >
          {copied ? "✅ Copied!" : "📋 Copy text"}
        </button>

        {/* Start over */}
        <button
          onClick={onStartOver}
          className="brutal-btn brutal-btn-secondary px-4 py-2.5 text-sm"
          id="ocr-start-over-btn"
          style={{ borderColor: "var(--accent-coral)", color: "var(--accent-coral)" }}
        >
          ↩ Start Over
        </button>
      </div>
    </div>
  );
}
