"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, X, Key, Loader2 } from "lucide-react";

interface KeyFieldProps {
  label: string;
  provider: string;
  placeholder: string;
  value: string;
  masked: string | null;
  onChange: (v: string) => void;
  onClear: () => void;
}

function KeyField({ label, provider, placeholder, value, masked, onChange, onClear }: KeyFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary, #F1F1F3)" }}
        >
          {label}
        </label>
        {masked && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{
              backgroundColor: "rgba(34,197,94,0.1)",
              color: "#22C55E",
            }}
          >
            saved {masked}
          </span>
        )}
      </div>
      <div className="relative">
        <Key
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted, #6B6F80)" }}
        />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={masked ? `Replace current key (${masked})` : placeholder}
          className="w-full pl-9 pr-20 py-2.5 rounded-lg text-sm font-mono outline-none"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-primary, #F1F1F3)",
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="p-1.5 rounded hover:bg-white/5"
            style={{ color: "var(--text-muted, #6B6F80)" }}
            title={show ? "Hide" : "Show"}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {(value || masked) && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded hover:bg-red-500/10"
              style={{ color: "#EF4444" }}
              title="Clear key"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted, #6B6F80)" }}>
        Used for {provider} translations. Leave blank to use the server default.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [maskedGemini, setMaskedGemini] = useState<string | null>(null);
  const [maskedDeeepseek, setMaskedDeepseek] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [clearGemini, setClearGemini] = useState(false);
  const [clearDeepseek, setClearDeepseek] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setMaskedGemini(data.gemini_api_key ?? null);
        setMaskedDeepseek(data.deepseek_api_key ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    const body: Record<string, string | null> = {};
    if (geminiKey.trim()) body.gemini_api_key = geminiKey.trim();
    else if (clearGemini) body.gemini_api_key = null;

    if (deepseekKey.trim()) body.deepseek_api_key = deepseekKey.trim();
    else if (clearDeepseek) body.deepseek_api_key = null;

    if (Object.keys(body).length === 0) {
      setStatus({ type: "error", message: "Nothing to save — enter a key or clear an existing one." });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }

      // Refresh masked values
      const updated = await fetch("/api/admin/settings").then((r) => r.json());
      setMaskedGemini(updated.gemini_api_key ?? null);
      setMaskedDeepseek(updated.deepseek_api_key ?? null);

      setGeminiKey("");
      setDeepseekKey("");
      setClearGemini(false);
      setClearDeepseek(false);
      setStatus({ type: "success", message: "Settings saved." });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function handleClearGemini() {
    setGeminiKey("");
    setClearGemini(true);
    setMaskedGemini(null);
  }

  function handleClearDeepseek() {
    setDeepseekKey("");
    setClearDeepseek(true);
    setMaskedDeepseek(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary, #F1F1F3)" }}>
          Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted, #6B6F80)" }}>
          Store your own API keys for AI translations. Keys are saved to your account.
        </p>
      </div>

      <div
        className="rounded-xl p-6 space-y-6"
        style={{
          backgroundColor: "var(--bg-secondary, #111217)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary, #F1F1F3)" }}>
          Translation API Keys
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="space-y-5">
            <KeyField
              label="Gemini API Key"
              provider="Gemini"
              placeholder="AIza…"
              value={geminiKey}
              masked={maskedGemini}
              onChange={setGeminiKey}
              onClear={handleClearGemini}
            />
            <KeyField
              label="DeepSeek API Key"
              provider="DeepSeek"
              placeholder="sk-…"
              value={deepseekKey}
              masked={maskedDeeepseek}
              onChange={setDeepseekKey}
              onClear={handleClearDeepseek}
            />
          </div>
        )}

        {status && (
          <div
            className="px-4 py-3 rounded-lg text-sm flex items-center justify-between"
            style={{
              backgroundColor: status.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${status.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              color: status.type === "success" ? "#86EFAC" : "#FCA5A5",
            }}
          >
            {status.message}
            <button onClick={() => setStatus(null)} className="ml-2 font-bold opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FFE500, #FF9500)",
              color: "#0A0A0F",
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Keys
          </button>
        </div>
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "rgba(255,229,0,0.04)",
          border: "1px solid rgba(255,229,0,0.1)",
        }}
      >
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted, #6B6F80)" }}>
          <strong style={{ color: "var(--text-primary)" }}>How it works:</strong> When you run a
          translation, your stored key is used first. If no key is saved, the server default is used.
          Keys are stored in your account and never shown in full after saving.
        </p>
      </div>
    </div>
  );
}
