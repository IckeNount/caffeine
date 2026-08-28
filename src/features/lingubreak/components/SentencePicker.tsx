interface SentencePickerProps {
  sentences: string[];
  onSelect: (sentence: string) => void;
  label?: string;
}

export default function SentencePicker({
  sentences,
  onSelect,
  label = "Choose one sentence to break down",
}: SentencePickerProps) {
  return (
    <div className="space-y-2">
      <p
        className="font-heading text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <div className="grid gap-2">
        {sentences.map((sentence, index) => (
          <button
            key={`${index}-${sentence}`}
            type="button"
            onClick={() => onSelect(sentence)}
            className="flex items-start gap-3 p-3 text-left transition-transform hover:-translate-y-0.5"
            style={{
              color: "var(--text-secondary)",
              background: "var(--bg-card)",
              border: "2px solid var(--border-brutal)",
              boxShadow: "var(--shadow-brutal-sm)",
            }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center font-heading text-xs font-bold"
              style={{ background: "var(--accent-gold)", color: "#000" }}
            >
              {index + 1}
            </span>
            <span className="text-sm leading-relaxed">{sentence}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
