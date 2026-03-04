"use client";

import { useRef } from "react";
import { Upload, FileAudio } from "lucide-react";
import { ACCEPTED_AUDIO_EXTENSIONS, MAX_AUDIO_SIZE } from "@/shared/lib/transcription";

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function AudioUploader({
  onFileSelected,
  isLoading,
  disabled = false,
}: AudioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!isLoading && !disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      // Reset so same file can be re-uploaded
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading || disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      onFileSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const maxSizeMB = (MAX_AUDIO_SIZE / (1024 * 1024)).toFixed(0);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO_EXTENSIONS}
        onChange={handleChange}
        className="hidden"
        id="audio-upload-input"
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="group cursor-pointer transition-all duration-150"
        style={{
          border: "3px dashed var(--border-brutal)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          background: "var(--bg-primary)",
          opacity: isLoading || disabled ? 0.5 : 1,
          pointerEvents: isLoading || disabled ? "none" : "auto",
        }}
        id="audio-drop-zone"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110"
            style={{
              border: "3px solid var(--border-brutal)",
              background: "var(--accent-gold)",
              boxShadow: "var(--shadow-brutal-sm)",
            }}
          >
            {disabled ? (
              <FileAudio className="w-6 h-6 text-black" />
            ) : (
              <Upload className="w-6 h-6 text-black" />
            )}
          </div>

          <div>
            <p
              className="text-sm font-heading uppercase tracking-wider font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {disabled ? "Audio uploaded" : "Drop audio file or click to browse"}
            </p>
            <p
              className="text-xs font-sarabun mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              MP3, WAV, M4A, OGG, FLAC, WebM · Max {maxSizeMB} MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
