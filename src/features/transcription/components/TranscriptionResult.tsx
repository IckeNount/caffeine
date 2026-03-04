"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ArrowRight, RotateCcw, Clock, Cpu, Timer } from "lucide-react";
import type { TranscriptionResult } from "@/shared/lib/transcription";
import SubtitlePlayer from "./SubtitlePlayer";

interface TranscriptionResultProps {
  result: TranscriptionResult;
  /** Blob URL or remote URL for the audio file (enables subtitle player). */
  audioUrl?: string;
  onSendToLinguBreak: (text: string) => void;
  onStartOver: () => void;
}

export default function TranscriptionResultDisplay({
  result,
  audioUrl,
  onSendToLinguBreak,
  onStartOver,
}: TranscriptionResultProps) {
  const [editedText, setEditedText] = useState(result.text);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = editedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [editedText]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const modelLabel =
    result.model === "whisper-large-v3"
      ? "Whisper Large v3 (High Accuracy)"
      : "Whisper Large v3 Turbo (Fast)";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="section-title">📝 Transcription Result</div>
        <button
          onClick={onStartOver}
          className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider px-3 py-1.5 transition-colors hover:opacity-80"
          style={{
            border: "2px solid var(--border-brutal)",
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-brutal-sm)",
          }}
          id="transcription-start-over"
        >
          <RotateCcw className="w-3 h-3" />
          Start over
        </button>
      </div>

      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1 text-xs font-heading uppercase tracking-wider px-2.5 py-1"
          style={{
            border: "2px solid var(--accent-gold)",
            color: "var(--accent-gold)",
            background: "var(--bg-primary)",
          }}
        >
          <Cpu className="w-3 h-3" />
          {modelLabel}
        </span>
        <span
          className="inline-flex items-center gap-1 text-xs font-heading uppercase tracking-wider px-2.5 py-1"
          style={{
            border: "2px solid var(--accent-teal)",
            color: "var(--accent-teal)",
            background: "var(--bg-primary)",
          }}
        >
          <Clock className="w-3 h-3" />
          Audio: {formatDuration(result.duration)}
        </span>
        <span
          className="inline-flex items-center gap-1 text-xs font-heading uppercase tracking-wider px-2.5 py-1"
          style={{
            border: "2px solid var(--accent-purple)",
            color: "var(--accent-purple)",
            background: "var(--bg-primary)",
          }}
        >
          <Timer className="w-3 h-3" />
          Processed: {(result.processingTimeMs / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Editable text area */}
      <div>
        <label
          className="block text-xs font-heading uppercase tracking-wider mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Review & edit transcription:
        </label>
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={8}
          className="w-full text-sm font-sarabun leading-relaxed resize-y focus:outline-none"
          style={{
            border: "3px solid var(--border-brutal)",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            padding: "0.75rem 1rem",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
          }}
          id="transcription-text-editor"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 text-xs font-heading uppercase tracking-wider font-bold px-4 py-2.5 transition-all hover:translate-y-[-1px]"
          style={{
            border: "3px solid var(--border-brutal)",
            background: copied ? "var(--accent-teal)" : "var(--bg-card)",
            color: copied ? "black" : "var(--text-primary)",
            boxShadow: "var(--shadow-brutal-sm)",
          }}
          id="transcription-copy-btn"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy text
            </>
          )}
        </button>

        <button
          onClick={() => onSendToLinguBreak(editedText)}
          className="flex items-center justify-center gap-2 text-xs font-heading uppercase tracking-wider font-bold px-4 py-2.5 transition-all hover:translate-y-[-1px]"
          style={{
            border: "3px solid var(--border-brutal)",
            background: "var(--accent-gold)",
            color: "black",
            boxShadow: "var(--shadow-brutal-sm)",
          }}
          id="transcription-send-lingubreak"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Send to LinguBreak
        </button>
      </div>

      {/* Subtitle-synced audio player */}
      {audioUrl && result.segments.length > 0 && (
        <SubtitlePlayer audioUrl={audioUrl} segments={result.segments} />
      )}

      {/* Segments (collapsible — fallback when no audio) */}
      {(!audioUrl) && result.segments.length > 0 && (
        <details className="group">
          <summary
            className="cursor-pointer text-xs font-heading uppercase tracking-wider py-2 select-none"
            style={{ color: "var(--text-muted)" }}
          >
            ▸ Show {result.segments.length} segment{result.segments.length > 1 ? "s" : ""} with timestamps
          </summary>
          <div
            className="mt-2 max-h-60 overflow-y-auto space-y-1 p-3"
            style={{
              border: "2px solid var(--border-brutal)",
              background: "var(--bg-primary)",
            }}
          >
            {result.segments.map((seg) => (
              <div key={seg.id} className="flex gap-3 text-xs">
                <span
                  className="font-mono shrink-0 tabular-nums"
                  style={{ color: "var(--accent-teal)", minWidth: "5rem" }}
                >
                  {formatDuration(seg.start)} → {formatDuration(seg.end)}
                </span>
                <span
                  className="font-sarabun"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {seg.text}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
