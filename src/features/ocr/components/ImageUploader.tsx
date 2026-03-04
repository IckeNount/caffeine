"use client";

import { useRef, useState, useCallback } from "react";

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function ImageUploader({
  onFileSelected,
  isLoading,
  disabled = false,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateAndPreview = useCallback(
    (file: File) => {
      setFileError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFileError(`Unsupported format. Please use JPEG, PNG, or WebP.`);
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setFileError(`File is too large (${sizeMB} MB). Max is ${MAX_SIZE_MB} MB.`);
        return;
      }

      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        setFileName(file.name);
        onFileSelected(file);
      };
      reader.readAsDataURL(file);
    },
    [onFileSelected]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndPreview(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndPreview(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleClick = () => {
    if (!isLoading && !disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        id="ocr-file-input"
      />

      {/* Drop zone / preview */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        id="ocr-drop-zone"
        className="relative cursor-pointer transition-all duration-150"
        style={{
          background: isDragOver ? "var(--bg-card-hover)" : "var(--bg-primary)",
          border: `3px dashed ${isDragOver ? "var(--accent-gold)" : fileError ? "var(--accent-coral)" : "var(--text-muted)"}`,
          boxShadow: isDragOver ? "var(--shadow-brutal), 0 0 20px -5px rgba(255, 229, 0, 0.2)" : "var(--shadow-brutal-sm)",
          borderRadius: "0px",
          padding: preview ? "0.75rem" : "2.5rem 1.5rem",
          opacity: disabled ? 0.4 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        {preview ? (
          /* Image preview */
          <div className="flex gap-4 items-start">
            <div
              className="shrink-0 overflow-hidden"
              style={{
                border: "2px solid var(--border-brutal)",
                boxShadow: "var(--shadow-brutal-sm)",
                width: "120px",
                height: "120px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2 py-1">
              <p
                className="font-heading font-bold text-sm uppercase tracking-wide truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {fileName}
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {isLoading ? "⏳ Extracting text…" : "✅ Ready to extract"}
              </p>
              {!isLoading && (
                <button
                  onClick={handleClear}
                  className="text-xs font-heading uppercase tracking-wider px-2 py-1"
                  style={{
                    color: "var(--accent-coral)",
                    border: "2px solid var(--accent-coral)",
                    background: "transparent",
                  }}
                  id="ocr-clear-btn"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="text-center space-y-3">
            <div
              className="w-14 h-14 mx-auto flex items-center justify-center text-2xl"
              style={{
                border: "3px solid var(--border-brutal)",
                background: "var(--bg-card)",
                boxShadow: "var(--shadow-brutal-sm)",
              }}
            >
              📷
            </div>
            <div>
              <p className="font-heading font-bold text-sm uppercase tracking-wide"
                style={{ color: "var(--text-primary)" }}>
                {isDragOver ? "Drop it here!" : "Upload an image"}
              </p>
              <p className="text-xs mt-1 font-sarabun" style={{ color: "var(--text-secondary)" }}>
                Drag & drop or click to browse — JPEG, PNG, WebP (max 10 MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {fileError && (
        <div
          className="text-xs font-heading uppercase tracking-wider px-3 py-2"
          style={{
            background: "rgba(255, 77, 77, 0.1)",
            border: "2px solid var(--accent-coral)",
            color: "var(--accent-coral)",
          }}
          id="ocr-file-error"
        >
          ⚠ {fileError}
        </div>
      )}
    </div>
  );
}
