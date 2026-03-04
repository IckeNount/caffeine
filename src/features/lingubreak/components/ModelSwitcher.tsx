"use client";

import React from "react";
import { AIProvider, PROVIDERS } from "@/features/lingubreak/lib/ai-providers";
import { ChevronDown } from "lucide-react";

interface ModelSwitcherProps {
  provider: AIProvider;
  onChange: (provider: AIProvider) => void;
  disabled?: boolean;
}

export default function ModelSwitcher({
  provider,
  onChange,
  disabled = false,
}: ModelSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const current = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-sm font-bold font-heading uppercase tracking-wide transition-all duration-150 select-none"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '2px solid var(--border-brutal)',
          boxShadow: 'var(--shadow-brutal-sm)',
          color: 'var(--text-secondary)',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span className="text-base">{current.icon}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="absolute top-full left-0 mt-2 z-40 min-w-[220px] overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '3px solid var(--border-brutal)',
              boxShadow: 'var(--shadow-brutal)',
            }}
          >
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-100"
                style={{
                  backgroundColor: p.id === provider ? 'rgba(255, 229, 0, 0.15)' : 'transparent',
                  color: p.id === provider ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => {
                  if (p.id !== provider) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (p.id !== provider) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span className="text-lg">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold font-heading uppercase">{p.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                </div>
                {p.id === provider && (
                  <span
                    className="w-3 h-3 flex-shrink-0 border-2 border-black"
                    style={{ backgroundColor: 'var(--accent-gold)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
