"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;
  onClear?: () => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function ImageUploader({
  onFileSelected,
  isLoading,
  disabled = false,
  onClear,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateAndPreview = useCallback(
    (file: File) => {
      setFileError(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFileError("Unsupported format. Please use JPEG, PNG, or WebP.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setFileError(
          `File is too large (${sizeMB} MB). Max is ${MAX_SIZE_MB} MB.`,
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
        setFileName(file.name);
        onFileSelected(file);
      };
      reader.readAsDataURL(file);
    },
    [onFileSelected],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) validateAndPreview(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) validateAndPreview(file);
  };

  const handleClear = () => {
    setPreview(null);
    setFileName(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onClear?.();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isLoading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isLoading}
      />

      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        className={`rounded-2xl border-2 border-dashed p-4 transition-colors sm:p-6 ${isDragOver ? "border-[var(--accent-teal)] bg-[var(--surface-teal)]" : "border-[rgba(23,35,60,0.2)] bg-white"}`}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        {preview ? (
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--border-brutal)] sm:h-28 sm:w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Upload preview" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <p className="font-heading text-sm font-semibold text-[var(--text-primary)] break-words">
                {fileName}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {isLoading ? "กำลังอ่านข้อความ… · Reading text" : "พร้อมอ่านตัวหนังสือ · Image ready"}
              </p>
              {!isLoading && (
                <button type="button" onClick={handleClear} className="learner-button learner-button-quiet mt-3 text-sm">
                  <X className="h-4 w-4" aria-hidden="true" />ล้างรูป · Clear
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-teal)]">
              <Camera className="h-6 w-6" aria-hidden="true" />
            </div>
            <p lang="th" className="mt-3 font-thai text-base font-semibold">ถ่ายรูปหรือเลือกรูปข้อความ</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">JPEG, PNG, or WebP · maximum 10 MB</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isLoading}
                className="learner-button learner-button-quiet text-sm"
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />เลือกรูป · Upload
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled || isLoading}
                className="learner-button learner-button-primary text-sm"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />ถ่ายรูป · Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {fileError && (
        <p role="alert" className="rounded-xl bg-[#FFF1EF] px-3 py-2 text-sm text-[var(--accent-coral)]">
          {fileError}
        </p>
      )}
    </div>
  );
}
