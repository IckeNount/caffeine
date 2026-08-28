import { Languages, Lightbulb } from "lucide-react";

interface TranslationHeroProps {
  thaiTranslation: string;
  simplifiedEnglish: string;
}

export default function TranslationHero({
  thaiTranslation,
  simplifiedEnglish,
}: TranslationHeroProps) {
  return (
    <section className="learner-card learner-card-accent p-5 pt-7 sm:p-8 sm:pt-9" aria-labelledby="thai-meaning-title">
      <div className="flex items-start gap-3">
        <span className="section-icon section-icon-gold" aria-hidden="true">
          <Languages className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="thai-meaning-title" className="section-heading">
            ความหมายภาษาไทย
          </h2>
          <p className="section-subtitle">Start with the meaning</p>
        </div>
      </div>

      <p
        lang="th"
        className="mt-6 font-thai text-2xl font-semibold leading-[1.75] text-[var(--text-primary)] sm:text-[1.75rem]"
      >
        {thaiTranslation}
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[var(--surface-blue)] p-4">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#356fae]" aria-hidden="true" />
        <div>
          <p className="eyebrow">ใจความหลัก · Core sentence</p>
          <p lang="en" className="mt-1 text-base font-bold leading-relaxed text-[var(--text-primary)]">
            {simplifiedEnglish}
          </p>
        </div>
      </div>
    </section>
  );
}
