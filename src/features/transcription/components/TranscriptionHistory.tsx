"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Clock, Cpu, Loader2 } from "lucide-react";
import type { TranscriptionSummary } from "@/shared/lib/transcription";

interface TranscriptionHistoryProps {
  /** Called when user clicks a history item to load it. */
  onSelect: (id: string) => void;
  /** Force a refresh when this value changes (e.g., after new save). */
  refreshKey?: number;
}

export default function TranscriptionHistory({
  onSelect,
  refreshKey = 0,
}: TranscriptionHistoryProps) {
  const [items, setItems] = useState<TranscriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/transcriptions?limit=20&offset=0");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("[History Fetch Error]", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/transcriptions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("[Delete Error]", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Loader2
          className="w-5 h-5 animate-spin mx-auto"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p
        className="text-xs font-sarabun text-center py-4"
        style={{ color: "var(--text-muted)" }}
      >
        ยังไม่มีประวัติ — No transcription history yet
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item.id)}
          className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-all duration-150 group hover:translate-x-0.5"
          style={{
            border: "2px solid var(--border-brutal)",
            background: "var(--bg-primary)",
          }}
          id={`history-item-${item.id}`}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-heading truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {item.title || "Untitled"}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <span
                className="inline-flex items-center gap-1 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(item.duration)}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                <Cpu className="w-2.5 h-2.5" />
                {item.model === "whisper-large-v3" ? "v3" : "Turbo"}
              </span>
              <span
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                {formatDate(item.created_at)}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => handleDelete(item.id, e)}
            disabled={deletingId === item.id}
            className="shrink-0 w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
            style={{
              border: "2px solid var(--accent-coral)",
              background:
                deletingId === item.id
                  ? "var(--accent-coral)"
                  : "transparent",
            }}
          >
            {deletingId === item.id ? (
              <Loader2
                className="w-3 h-3 animate-spin"
                style={{ color: "var(--accent-coral)" }}
              />
            ) : (
              <Trash2
                className="w-3 h-3"
                style={{ color: "var(--accent-coral)" }}
              />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
