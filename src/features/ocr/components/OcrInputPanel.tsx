"use client";

import { useEffect, useMemo, useState } from "react";
import SentencePicker from "@/features/lingubreak/components/SentencePicker";
import { splitEnglishSentences } from "@/shared/lib/text/split-english-sentences";
import { useOcr } from "../hooks/useOcr";
import ImageUploader from "./ImageUploader";

const LOW_CONFIDENCE = 0.55;

interface OcrInputPanelProps {
  open: boolean;
  onSelect: (sentence: string) => void;
}

export default function OcrInputPanel({ open, onSelect }: OcrInputPanelProps) {
  const {
    result,
    isLoading,
    error,
    progress,
    activeProvider,
    uploadAndExtract,
    reset,
  } = useOcr();
  const [editableText, setEditableText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cloudAvailable, setCloudAvailable] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch("/api/ocr", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { enabled?: unknown };
        setCloudAvailable(data.enabled === true);
      })
      .catch(() => setCloudAvailable(false));
    return () => controller.abort();
  }, [open]);

  const sentences = useMemo(
    () => splitEnglishSentences(editableText),
    [editableText],
  );
  const needsRecovery =
    Boolean(error) ||
    Boolean(
      result &&
        (result.confidence < LOW_CONFIDENCE || sentences.length === 0),
    );

  if (!open) return null;

  const runLocalOcr = async (file: File) => {
    setSelectedFile(file);
    const extracted = await uploadAndExtract(file, "tesseract");
    if (extracted) setEditableText(extracted.text);
  };

  const runCloudOcr = async () => {
    if (!selectedFile) return;
    const extracted = await uploadAndExtract(selectedFile, "gemini", true);
    if (extracted) setEditableText(extracted.text);
  };

  const clear = () => {
    setEditableText("");
    setSelectedFile(null);
    reset();
  };

  return (
    <div className="source-panel space-y-4">
      <ImageUploader
        onFileSelected={(file) => void runLocalOcr(file)}
        onClear={clear}
        isLoading={isLoading}
      />

      {isLoading && (
        <p className="text-sm text-[var(--text-secondary)]" role="status">
          {activeProvider === "gemini"
            ? "Improving the extraction with cloud OCR…"
            : `Reading the image locally…${progress === null ? "" : ` ${progress}%`}`}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--accent-coral)]">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="ocr-editable-text" className="eyebrow">
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

      {selectedFile && needsRecovery && !isLoading && (
        <div className="rounded-xl bg-[#FFF9E8] p-3 text-sm text-[var(--text-secondary)]">
          <p>
            Retake a clearer photo or correct the text manually. Local OCR never uploads your image.
          </p>
          {cloudAvailable && result?.provider !== "gemini" && (
            <button
              type="button"
              onClick={() => void runCloudOcr()}
              className="learner-button learner-button-quiet mt-3 text-sm"
            >
              Improve with cloud OCR — image leaves this device
            </button>
          )}
        </div>
      )}
    </div>
  );
}
