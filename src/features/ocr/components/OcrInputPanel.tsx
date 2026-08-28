"use client";

import { useMemo, useState } from "react";
import SentencePicker from "@/features/lingubreak/components/SentencePicker";
import { splitEnglishSentences } from "@/shared/lib/text/split-english-sentences";
import { useOcr } from "../hooks/useOcr";
import ImageUploader from "./ImageUploader";

interface OcrInputPanelProps {
  open: boolean;
  onSelect: (sentence: string) => void;
}

export default function OcrInputPanel({ open, onSelect }: OcrInputPanelProps) {
  const { result, isLoading, error, progress, uploadAndExtract, reset } =
    useOcr("tesseract");
  const [editableText, setEditableText] = useState("");

  const sentences = useMemo(
    () => splitEnglishSentences(editableText),
    [editableText],
  );

  if (!open) return null;

  const clear = () => {
    setEditableText("");
    reset();
  };

  return (
    <div className="source-panel space-y-4">
      <ImageUploader
        onFileSelected={(file) => {
          void uploadAndExtract(file).then((extracted) => {
            if (extracted) setEditableText(extracted.text);
          });
        }}
        onClear={clear}
        isLoading={isLoading}
      />

      {isLoading && (
        <p className="text-sm text-[var(--text-secondary)]" role="status">
          Reading the image locally…{progress === null ? "" : ` ${progress}%`}
        </p>
      )}
      {error && <p className="text-sm text-[var(--accent-coral)]">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="ocr-editable-text"
              className="eyebrow"
            >
              Review the extracted text
            </label>
            <textarea
              id="ocr-editable-text"
              value={editableText}
              onChange={(event) => setEditableText(event.target.value)}
              className="learner-input min-h-[140px] resize-y p-3 text-base leading-relaxed"
            />
          </div>

          {sentences.length > 0 ? (
            <SentencePicker sentences={sentences} onSelect={onSelect} />
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              No complete sentence is ready yet. Correct the text above or try a clearer image.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
