"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import SentencePicker from "@/features/lingubreak/components/SentencePicker";
import {
  DailyReadingSchema,
  type DailyReading,
} from "../lib/schema";

interface DailyReadingPanelProps {
  open: boolean;
  onSelect: (sentence: string) => void;
}

export default function DailyReadingPanel({
  open,
  onSelect,
}: DailyReadingPanelProps) {
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || reading) return;

    const controller = new AbortController();
    async function loadReading() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/daily-reading", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("DAILY_READING_UNAVAILABLE");
        setReading(DailyReadingSchema.parse(await response.json()));
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError("Today’s reading is unavailable right now. You can retry or use another input.");
      } finally {
        setLoading(false);
      }
    }

    void loadReading();
    return () => controller.abort();
  }, [attempt, open, reading]);

  if (!open) return null;

  return (
    <div
      className="space-y-4 p-4"
      style={{
        background: "var(--bg-primary)",
        border: "2px solid var(--border-brutal)",
      }}
    >
      {loading && (
        <div className="flex items-center gap-2 py-5 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing today’s reading…
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--accent-coral)" }}>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
            className="brutal-btn brutal-btn-secondary px-3 py-2 text-xs"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {reading && (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-lg font-bold uppercase">{reading.title}</h3>
              <span className="font-heading text-xs" style={{ color: "var(--text-muted)" }}>
                {reading.generatedDate}
              </span>
            </div>
            <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              {reading.paragraph}
            </p>
          </div>

          <SentencePicker sentences={reading.sentences} onSelect={onSelect} />

          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {reading.adaptationNotice}{" "}
            <a
              href={reading.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              {reading.source.title} <ExternalLink className="h-3 w-3" />
            </a>{" "}
            ·{" "}
            <a
              href={reading.source.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {reading.source.licenseName}
            </a>
          </p>
        </>
      )}
    </div>
  );
}
