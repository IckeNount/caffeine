"use client";

import React, { useState } from "react";
import { PedagogicalStep } from "@/features/lingubreak/lib/schema";
import { ChevronDown, Heart, Search, Brackets, RefreshCw } from "lucide-react";

const STEP_ICONS = [
  <Heart key="heart" className="w-4 h-4" />,
  <Search key="search" className="w-4 h-4" />,
  <Brackets key="brackets" className="w-4 h-4" />,
  <RefreshCw key="refresh" className="w-4 h-4" />,
];

const STEP_COLORS = [
  { bg: "#FF4D4D", text: "#fff" },
  { bg: "#22C55E", text: "#fff" },
  { bg: "#F59E0B", text: "#000" },
  { bg: "#A855F7", text: "#fff" },
];

interface StepAccordionProps {
  steps: PedagogicalStep[];
}

export default function StepAccordion({ steps }: StepAccordionProps) {
  const [openStep, setOpenStep] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      <h3 className="section-title flex items-center gap-2">
        📋 4-Step Breakdown
      </h3>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isOpen = openStep === index;
          const color = STEP_COLORS[index] || STEP_COLORS[0];
          return (
            <div
              key={index}
              className="overflow-hidden transition-all duration-200"
              style={{
                backgroundColor: isOpen ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                border: '3px solid var(--border-brutal)',
                boxShadow: isOpen ? 'var(--shadow-brutal)' : 'var(--shadow-brutal-sm)',
                transform: isOpen ? 'translate(-1px, -1px)' : 'none',
              }}
            >
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className="w-full flex items-center gap-3 p-4 text-left transition-colors duration-150"
              >
                {/* Step Number Badge */}
                <div
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 border-2 border-black font-heading font-bold"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {STEP_ICONS[index]}
                </div>

                {/* Titles */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold font-heading uppercase tracking-wide truncate" style={{ color: 'var(--text-primary)' }}>
                    Step {step.step_number}: {step.title}
                  </p>
                  <p className="text-xs font-sarabun truncate" style={{ color: 'var(--text-muted)' }}>
                    {step.title_thai}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                  style={{ color: 'var(--text-muted)' }}
                />
              </button>

              {/* Expandable Content */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div
                  className="px-4 pb-4 space-y-3 pt-3"
                  style={{ borderTop: '2px solid var(--border-subtle)' }}
                >
                  {/* Highlighted Text */}
                  {step.highlighted_text && (
                    <div
                      className="px-3 py-2"
                      style={{
                        backgroundColor: 'rgba(255, 229, 0, 0.1)',
                        border: '2px solid var(--accent-gold)',
                      }}
                    >
                      <p className="text-sm font-mono" style={{ color: 'var(--accent-gold)' }}>
                        &ldquo;{step.highlighted_text}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* English Description */}
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {step.description}
                  </p>

                  {/* Thai Description */}
                  <p className="text-sm leading-relaxed font-sarabun" style={{ color: 'var(--text-muted)' }}>
                    🇹🇭 {step.description_thai}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
