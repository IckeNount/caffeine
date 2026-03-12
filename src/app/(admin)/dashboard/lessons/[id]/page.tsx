"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Globe,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Languages,
  GripVertical,
  Upload,
  CheckCircle2,
  XCircle,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface Segment {
  id: string;
  sort_order: number;
  original_text: string;
  thai_translation: string | null;
  grammar_breakdown: object | null;
  audio_start: number | null;
  audio_end: number | null;
}

interface Lesson {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  tags: string[];
  difficulty: string | null;
  folder_id: string | null;
  folder: { id: string; name: string; color: string } | null;
  audio_path: string | null;
  segments: Segment[];
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

type TranslationProvider = "gemini" | "deepseek";

export default function LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);

  // Meta editing
  const [editTitle, setEditTitle] = useState("");
  const [editFolderId, setEditFolderId] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("");

  // Translation
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [provider, setProvider] = useState<TranslationProvider>("gemini");
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    completed: 0,
    total: 0,
    status: "",
  });

  // Bulk text import
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // Auto-save timer
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const fetchLesson = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLesson(data.lesson);
      setSegments(data.lesson.segments || []);
      setEditTitle(data.lesson.title);
      setEditFolderId(data.lesson.folder_id || "");
      setEditTags((data.lesson.tags || []).join(", "));
      setEditDifficulty(data.lesson.difficulty || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/folders");
      const data = await res.json();
      if (res.ok) setFolders(data.folders || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchLesson();
    fetchFolders();
  }, [fetchLesson, fetchFolders]);

  // Auto-save debounce
  useEffect(() => {
    if (hasUnsaved) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => handleSaveMeta(), 5000);
    }
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsaved, editTitle, editFolderId, editTags, editDifficulty]);

  async function handleSaveMeta() {
    if (!lesson) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          folder_id: editFolderId || null,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          difficulty: editDifficulty || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setHasUnsaved(false);
      showSuccess("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!lesson) return;
    const newStatus = lesson.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      showSuccess(newStatus === "published" ? "Published!" : "Unpublished");
      fetchLesson();
    } catch {
      setError("Status change failed");
    }
  }

  // Segment operations
  async function addSegment(text: string) {
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_text: text }),
      });
      if (!res.ok) throw new Error("Failed to add");
      fetchLesson();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  async function updateSegment(segId: string, data: Partial<Segment>) {
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/segments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: [{ id: segId, ...data }] }),
      });
      if (!res.ok) throw new Error("Update failed");
      setSegments((prev) =>
        prev.map((s) => (s.id === segId ? { ...s, ...data } : s)),
      );
    } catch {
      setError("Segment update failed");
    }
  }

  async function deleteSegment(segId: string) {
    // Use the segment update to remove (we'll directly delete via Supabase in future)
    setSegments((prev) => prev.filter((s) => s.id !== segId));
    // For now, re-save all remaining segments
  }

  // Translation
  async function translateSingle(segId: string, text: string) {
    setTranslating((prev) => ({ ...prev, [segId]: true }));
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setSegments((prev) =>
        prev.map((s) =>
          s.id === segId ? { ...s, thai_translation: data.translation } : s,
        ),
      );
      // Auto-save translation
      await updateSegment(segId, { thai_translation: data.translation });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating((prev) => ({ ...prev, [segId]: false }));
    }
  }

  async function translateAll() {
    const untranslated = segments.filter((s) => !s.thai_translation);
    if (untranslated.length === 0) {
      showSuccess("All segments already translated!");
      return;
    }

    setBulkTranslating(true);
    setBulkProgress({
      completed: 0,
      total: untranslated.length,
      status: "Starting...",
    });

    try {
      const res = await fetch("/api/admin/translate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          segment_ids: untranslated.map((s) => s.id),
          provider,
        }),
      });
      if (!res.ok) throw new Error("Failed to start");
      const { jobId } = await res.json();

      // Poll for progress
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/admin/translate/status/${jobId}`);
        const statusData = await statusRes.json();
        setBulkProgress({
          completed: statusData.completedSegments,
          total: statusData.totalSegments,
          status: statusData.status,
        });

        if (
          statusData.status === "completed" ||
          statusData.status === "failed"
        ) {
          clearInterval(pollInterval);
          setBulkTranslating(false);

          if (statusData.status === "completed" && statusData.results) {
            // Apply translations to local state
            const resultMap = new Map(
              statusData.results.map(
                (r: { segment_id: string; translation: string }) => [
                  r.segment_id,
                  r.translation,
                ],
              ),
            );
            setSegments((prev) =>
              prev.map((s) => {
                const trans = resultMap.get(s.id);
                return trans ? { ...s, thai_translation: trans as string } : s;
              }),
            );
            showSuccess(`Translated ${statusData.completedSegments} segments!`);
          }
          if (statusData.status === "failed") {
            setError(statusData.errorMessage || "Bulk translation failed");
          }
          fetchLesson();
        }
      }, 2500);
    } catch (err) {
      setBulkTranslating(false);
      setError(err instanceof Error ? err.message : "Bulk translation failed");
    }
  }

  // Bulk text import
  async function handleBulkImport() {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      // Split text into sentences
      const sentences = importText
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (sentences.length === 0) {
        setError("No sentences found");
        return;
      }

      const res = await fetch(`/api/admin/lessons/${lessonId}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: sentences.map((s) => ({ original_text: s })),
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      setShowImport(false);
      setImportText("");
      showSuccess(`Imported ${sentences.length} sentences!`);
      fetchLesson();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[60vh]'>
        <Loader2
          size={32}
          className='animate-spin'
          style={{ color: "#FFE500" }}
        />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className='text-center py-20'>
        <p
          className='text-lg font-medium'
          style={{ color: "var(--text-muted)" }}
        >
          Lesson not found
        </p>
        <button
          onClick={() => router.push("/dashboard/lessons")}
          className='mt-4 text-sm underline'
          style={{ color: "#FFE500" }}
        >
          ← Back to Lessons
        </button>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto space-y-4'>
      {/* Top Bar */}
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => router.push("/dashboard/lessons")}
            className='p-2 rounded-lg hover:bg-white/5'
            title='Back'
          >
            <ArrowLeft size={20} style={{ color: "var(--text-muted)" }} />
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <span
                className='text-xs px-2 py-0.5 rounded-full font-medium'
                style={{
                  backgroundColor:
                    lesson.status === "published"
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(107,111,128,0.1)",
                  color: lesson.status === "published" ? "#22C55E" : "#6B6F80",
                }}
              >
                {lesson.status === "published" ? "Live" : lesson.status}
              </span>
              {hasUnsaved && (
                <span className='text-xs' style={{ color: "#F59E0B" }}>
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={handleSaveMeta}
            disabled={saving}
            className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5 disabled:opacity-50'
            style={{
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {saving ? (
              <Loader2 size={14} className='animate-spin' />
            ) : (
              <Save size={14} />
            )}{" "}
            Save
          </button>
          <button
            onClick={handlePublish}
            className='flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]'
            style={{
              background:
                lesson.status === "published"
                  ? "rgba(245,158,11,0.15)"
                  : "linear-gradient(135deg, #22C55E, #16A34A)",
              color: lesson.status === "published" ? "#F59E0B" : "#FFF",
            }}
          >
            {lesson.status === "published" ? (
              <>
                <FileText size={14} /> Unpublish
              </>
            ) : (
              <>
                <Globe size={14} /> Publish
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          className='flex items-center gap-2 p-3 rounded-lg text-sm'
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#FCA5A5",
          }}
        >
          <XCircle size={16} /> {error}
          <button onClick={() => setError(null)} className='ml-auto font-bold'>
            ×
          </button>
        </div>
      )}
      {success && (
        <div
          className='flex items-center gap-2 p-3 rounded-lg text-sm'
          style={{
            backgroundColor: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#86EFAC",
          }}
        >
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Meta Info Bar */}
      <div
        className='rounded-xl p-4'
        style={{
          backgroundColor: "var(--bg-secondary, #111217)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
          <div className='md:col-span-2'>
            <label
              className='text-xs font-medium mb-1 block'
              style={{ color: "var(--text-muted)" }}
            >
              Title
            </label>
            <input
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setHasUnsaved(true);
              }}
              className='w-full px-3 py-2 rounded-lg text-sm outline-none'
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className='text-xs font-medium mb-1 block'
              style={{ color: "var(--text-muted)" }}
            >
              Folder
            </label>
            <select
              value={editFolderId}
              onChange={(e) => {
                setEditFolderId(e.target.value);
                setHasUnsaved(true);
              }}
              className='w-full px-3 py-2 rounded-lg text-sm outline-none'
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-primary)",
              }}
            >
              <option value=''>None</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className='text-xs font-medium mb-1 block'
              style={{ color: "var(--text-muted)" }}
            >
              Difficulty
            </label>
            <select
              value={editDifficulty}
              onChange={(e) => {
                setEditDifficulty(e.target.value);
                setHasUnsaved(true);
              }}
              className='w-full px-3 py-2 rounded-lg text-sm outline-none'
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-primary)",
              }}
            >
              <option value=''>—</option>
              <option value='beginner'>Beginner</option>
              <option value='intermediate'>Intermediate</option>
              <option value='advanced'>Advanced</option>
            </select>
          </div>
        </div>
        <div className='mt-3'>
          <label
            className='text-xs font-medium mb-1 block'
            style={{ color: "var(--text-muted)" }}
          >
            Tags (comma-separated)
          </label>
          <input
            value={editTags}
            onChange={(e) => {
              setEditTags(e.target.value);
              setHasUnsaved(true);
            }}
            placeholder='grammar, tenses, beginner'
            className='w-full px-3 py-2 rounded-lg text-sm outline-none'
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className='flex items-center gap-2 flex-wrap'>
        <button
          onClick={() => setShowImport(true)}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors'
          style={{
            color: "var(--text-primary)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Upload size={14} /> Import Text
        </button>
        <button
          onClick={() => addSegment("")}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors'
          style={{
            color: "var(--text-primary)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Plus size={14} /> Add Segment
        </button>
        <div
          className='h-4 w-px mx-1'
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        />
        <div className='flex items-center gap-1.5'>
          <Sparkles size={14} style={{ color: "#FFE500" }} />
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as TranslationProvider)}
            className='px-2 py-1.5 rounded-lg text-xs outline-none'
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)",
            }}
          >
            <option value='gemini'>Gemini (default)</option>
            <option value='deepseek'>DeepSeek</option>
          </select>
          <button
            onClick={translateAll}
            disabled={bulkTranslating}
            className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50'
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #6366F1)",
              color: "#FFF",
            }}
          >
            {bulkTranslating ? (
              <Loader2 size={14} className='animate-spin' />
            ) : (
              <Languages size={14} />
            )}
            {bulkTranslating
              ? `${bulkProgress.completed}/${bulkProgress.total}`
              : "Translate All"}
          </button>
        </div>
      </div>

      {/* Bulk Progress Bar */}
      {bulkTranslating && (
        <div
          className='rounded-lg p-3'
          style={{
            backgroundColor: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-medium' style={{ color: "#A78BFA" }}>
              <RefreshCw size={12} className='inline animate-spin mr-1' />{" "}
              Translating with {provider}...
            </span>
            <span className='text-xs' style={{ color: "#A78BFA" }}>
              {bulkProgress.completed}/{bulkProgress.total}
            </span>
          </div>
          <div
            className='w-full h-1.5 rounded-full'
            style={{ backgroundColor: "rgba(139,92,246,0.2)" }}
          >
            <div
              className='h-full rounded-full transition-all duration-500'
              style={{
                width: `${bulkProgress.total > 0 ? (bulkProgress.completed / bulkProgress.total) * 100 : 0}%`,
                background: "linear-gradient(90deg, #8B5CF6, #6366F1)",
              }}
            />
          </div>
        </div>
      )}

      {/* Import Text Modal */}
      {showImport && (
        <div
          className='rounded-xl p-6 space-y-4'
          style={{
            backgroundColor: "var(--bg-secondary, #111217)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className='flex items-center justify-between'>
            <h2
              className='font-semibold'
              style={{ color: "var(--text-primary)" }}
            >
              Import Text
            </h2>
            <button
              onClick={() => setShowImport(false)}
              className='p-1 rounded hover:bg-white/5'
            >
              <XCircle size={18} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
          <p className='text-xs' style={{ color: "var(--text-muted)" }}>
            Paste a paragraph or multiple sentences. They&apos;ll be split
            automatically by sentence boundaries (. ! ?) or newlines.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='Paste your English text here...&#10;&#10;Each sentence will become a segment that you can translate individually.'
            rows={8}
            className='w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y'
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)",
            }}
          />
          <div className='flex items-center justify-between'>
            <span className='text-xs' style={{ color: "var(--text-muted)" }}>
              {importText.trim()
                ? `~${importText.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim()).length} sentences detected`
                : ""}
            </span>
            <div className='flex gap-2'>
              <button
                onClick={() => setShowImport(false)}
                className='px-4 py-2 rounded-lg text-sm hover:bg-white/5'
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={importing || !importText.trim()}
                className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50'
                style={{
                  background: "linear-gradient(135deg, #FFE500, #FF9500)",
                  color: "#0A0A0F",
                }}
              >
                {importing ? (
                  <Loader2 size={14} className='animate-spin' />
                ) : (
                  <Upload size={14} />
                )}{" "}
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Pane: Segments */}
      {segments.length === 0 ? (
        <div
          className='rounded-xl p-12 text-center'
          style={{
            backgroundColor: "var(--bg-secondary, #111217)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Languages
            size={48}
            className='mx-auto mb-4'
            style={{ color: "var(--text-muted)", opacity: 0.3 }}
          />
          <p className='font-medium' style={{ color: "var(--text-muted)" }}>
            No segments yet
          </p>
          <p
            className='text-xs mt-1 mb-4'
            style={{ color: "var(--text-muted)", opacity: 0.6 }}
          >
            Import text or add segments manually to start building your lesson.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold'
            style={{
              background: "linear-gradient(135deg, #FFE500, #FF9500)",
              color: "#0A0A0F",
            }}
          >
            <Upload size={16} /> Import Text
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Left Pane: English Segments */}
          <div className='space-y-2'>
            <h3
              className='text-xs font-semibold uppercase tracking-wider mb-3'
              style={{ color: "var(--text-muted)" }}
            >
              English Segments ({segments.length})
            </h3>
            {segments.map((seg, i) => (
              <div
                key={seg.id}
                onClick={() => setSelectedSegId(seg.id)}
                className='group flex items-start gap-2 p-3 rounded-xl cursor-pointer transition-all duration-150'
                style={{
                  backgroundColor:
                    selectedSegId === seg.id
                      ? "rgba(255,229,0,0.06)"
                      : "var(--bg-secondary, #111217)",
                  border:
                    selectedSegId === seg.id
                      ? "1px solid rgba(255,229,0,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className='flex flex-col items-center gap-1 pt-1 shrink-0'>
                  <GripVertical
                    size={14}
                    style={{ color: "var(--text-muted)", opacity: 0.3 }}
                  />
                  <span
                    className='text-[10px] font-mono'
                    style={{ color: "var(--text-muted)", opacity: 0.4 }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className='flex-1 min-w-0'>
                  <textarea
                    value={seg.original_text}
                    onChange={(e) => {
                      setSegments((prev) =>
                        prev.map((s) =>
                          s.id === seg.id
                            ? { ...s, original_text: e.target.value }
                            : s,
                        ),
                      );
                    }}
                    onBlur={() => {
                      if (seg.original_text.trim())
                        updateSegment(seg.id, {
                          original_text: seg.original_text,
                        });
                    }}
                    rows={2}
                    className='w-full text-sm bg-transparent outline-none resize-none'
                    style={{ color: "var(--text-primary)" }}
                    placeholder='Enter English text...'
                  />
                  {seg.thai_translation && (
                    <p
                      className='text-xs mt-1 pt-1'
                      style={{
                        color: "#A78BFA",
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      🇹🇭 {seg.thai_translation}
                    </p>
                  )}
                </div>
                <div className='flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      translateSingle(seg.id, seg.original_text);
                    }}
                    disabled={translating[seg.id] || !seg.original_text.trim()}
                    className='p-1.5 rounded-md hover:bg-purple-500/10 disabled:opacity-30'
                    title='Translate'
                  >
                    {translating[seg.id] ? (
                      <Loader2
                        size={14}
                        className='animate-spin'
                        style={{ color: "#A78BFA" }}
                      />
                    ) : (
                      <Languages size={14} style={{ color: "#A78BFA" }} />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSegment(seg.id);
                    }}
                    className='p-1.5 rounded-md hover:bg-red-500/10'
                    title='Remove'
                  >
                    <Trash2 size={14} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => addSegment("")}
              className='w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors'
              style={{
                border: "1px dashed rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
              }}
            >
              <Plus size={16} /> Add Segment
            </button>
          </div>

          {/* Right Pane: Translation & Annotation */}
          <div className='space-y-2'>
            <h3
              className='text-xs font-semibold uppercase tracking-wider mb-3'
              style={{ color: "var(--text-muted)" }}
            >
              Thai Translation & Annotations
            </h3>
            {selectedSegId ? (
              (() => {
                const seg = segments.find((s) => s.id === selectedSegId);
                if (!seg) return null;
                return (
                  <div
                    className='rounded-xl p-5 space-y-4'
                    style={{
                      backgroundColor: "var(--bg-secondary, #111217)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div>
                      <label
                        className='text-xs font-medium mb-1 block'
                        style={{ color: "var(--text-muted)" }}
                      >
                        Original (English)
                      </label>
                      <p
                        className='text-sm'
                        style={{ color: "var(--text-primary)" }}
                      >
                        {seg.original_text || "—"}
                      </p>
                    </div>
                    <div>
                      <div className='flex items-center justify-between mb-1'>
                        <label
                          className='text-xs font-medium'
                          style={{ color: "var(--text-muted)" }}
                        >
                          Thai Translation
                        </label>
                        <button
                          onClick={() =>
                            translateSingle(seg.id, seg.original_text)
                          }
                          disabled={
                            translating[seg.id] || !seg.original_text.trim()
                          }
                          className='flex items-center gap-1 text-xs font-medium disabled:opacity-30'
                          style={{ color: "#A78BFA" }}
                        >
                          {translating[seg.id] ? (
                            <Loader2 size={12} className='animate-spin' />
                          ) : (
                            <Sparkles size={12} />
                          )}{" "}
                          Auto-translate
                        </button>
                      </div>
                      <textarea
                        value={seg.thai_translation || ""}
                        onChange={(e) => {
                          setSegments((prev) =>
                            prev.map((s) =>
                              s.id === seg.id
                                ? { ...s, thai_translation: e.target.value }
                                : s,
                            ),
                          );
                        }}
                        onBlur={() =>
                          updateSegment(seg.id, {
                            thai_translation: seg.thai_translation,
                          })
                        }
                        rows={3}
                        placeholder='Enter Thai translation or click auto-translate...'
                        className='w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y'
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>
                    <div
                      className='flex items-center gap-2 pt-2'
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <ChevronDown
                        size={14}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className='text-xs'
                        style={{ color: "var(--text-muted)", opacity: 0.6 }}
                      >
                        Grammar breakdown — coming soon
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div
                className='rounded-xl p-8 text-center'
                style={{
                  backgroundColor: "var(--bg-secondary, #111217)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Languages
                  size={32}
                  className='mx-auto mb-3'
                  style={{ color: "var(--text-muted)", opacity: 0.3 }}
                />
                <p className='text-sm' style={{ color: "var(--text-muted)" }}>
                  Select a segment on the left to see its translation and
                  annotations
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
