"use client";

import { useId, useState } from "react";
import { Brackets, ChevronDown, Heart, ListChecks, RefreshCw, Search } from "lucide-react";
import type { PedagogicalStep } from "@/features/lingubreak/lib/schema";

const STEP_ICONS = [Heart, Search, Brackets, RefreshCw];
const STEP_BACKGROUNDS = ["#FFE1DF", "#E2F5DA", "#FFF0C7", "#EEE2FF"];

interface StepAccordionProps {
  steps: PedagogicalStep[];
}

export default function StepAccordion({ steps }: StepAccordionProps) {
  const [openStep, setOpenStep] = useState<number | null>(0);
  const id = useId();

  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="mb-4 flex items-start gap-3 px-1">
        <span className="section-icon section-icon-gold" aria-hidden="true">
          <ListChecks className="h-5 w-5" />
        </span>
        <div>
          <h2 id={`${id}-title`} className="section-heading">
            เรียนทีละขั้น
          </h2>
          <p className="section-subtitle">Four steps to understand the sentence</p>
        </div>
      </div>

      <div className="grid gap-3">
        {steps.map((step, index) => {
          const isOpen = openStep === index;
          const Icon = STEP_ICONS[index] ?? ListChecks;
          const panelId = `${id}-panel-${index}`;
          return (
            <article key={`${step.step_number}-${index}`} className="learner-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenStep(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex min-h-16 w-full items-center gap-3 p-4 text-left sm:p-5"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--border-brutal)]"
                  style={{ background: STEP_BACKGROUNDS[index] ?? STEP_BACKGROUNDS[0] }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span lang="th" className="block font-thai text-lg font-semibold leading-relaxed text-[var(--text-primary)]">
                    {step.step_number}. {step.title_thai}
                  </span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-[var(--text-secondary)]">
                    {step.title}
                  </span>
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[var(--text-secondary)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div id={panelId} className="border-t border-[var(--border-subtle)] px-4 pb-5 pt-4 sm:px-5">
                  {step.highlighted_text && (
                    <p className="rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-base font-bold leading-relaxed text-[var(--text-primary)]">
                      “{step.highlighted_text}”
                    </p>
                  )}
                  <p lang="th" className="thai-reading mt-4">
                    {step.description_thai}
                  </p>
                  <p lang="en" className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
                    {step.description}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
