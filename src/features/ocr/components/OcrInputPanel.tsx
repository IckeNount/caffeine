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
    <div
      className="space-y-4 p-4"
      style={{
        background: "var(--bg-primary)",
        border: "2px solid var(--border-brutal)",
      }}
    >
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
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Reading the image locally…{progress === null ? "" : ` ${progress}%`}
        </p>
      )}
      {error && <p className="text-sm" style={{ color: "var(--accent-coral)" }}>{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="ocr-editable-text"
              className="font-heading text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Review the extracted text
            </label>
            <textarea
              id="ocr-editable-text"
              value={editableText}
              onChange={(event) => setEditableText(event.target.value)}
              className="brutal-input min-h-[140px] w-full resize-y p-3 text-sm leading-relaxed"
            />
          </div>

          {sentences.length > 0 ? (
            <SentencePicker sentences={sentences} onSelect={onSelect} />
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No complete sentence is ready yet. Correct the text above or try a clearer image.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
