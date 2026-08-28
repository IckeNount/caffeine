interface SentencePickerProps {
  sentences: string[];
  onSelect: (sentence: string) => void;
  label?: string;
}

export default function SentencePicker({
  sentences,
  onSelect,
  label = "เลือกหนึ่งประโยค · Choose one sentence",
}: SentencePickerProps) {
  return (
    <div className="space-y-2">
      <p className="eyebrow">{label}</p>
      <div className="grid gap-2">
        {sentences.map((sentence, index) => (
          <button
            key={`${index}-${sentence}`}
            type="button"
            onClick={() => onSelect(sentence)}
            className="sentence-choice"
          >
            <span className="sentence-number">{index + 1}</span>
            <span className="text-sm leading-relaxed sm:text-base">{sentence}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
