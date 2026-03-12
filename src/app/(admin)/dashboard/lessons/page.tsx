"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Globe,
  FileText,
  Archive,
} from "lucide-react";

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface Lesson {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  tags: string[];
  difficulty: string | null;
  folder_id: string | null;
  folder: Folder | null;
  segments: { count: number }[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    icon: FileText,
    color: "#6B6F80",
    bg: "rgba(107,111,128,0.1)",
  },
  published: {
    label: "Live",
    icon: Globe,
    color: "#22C55E",
    bg: "rgba(34,197,94,0.1)",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
  },
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status: string;
    folder_id: string;
    search: string;
  }>({
    status: "",
    folder_id: "",
    search: "",
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFolderId, setNewFolderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.folder_id) params.set("folder_id", filter.folder_id);
      if (filter.search) params.set("search", filter.search);

      const res = await fetch(`/api/admin/lessons?${params}`);
      const data = await res.json();
      if (res.ok) setLessons(data.lessons || []);
      else setError(data.error);
    } catch {
      setError("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
    fetchLessons();
  }, [fetchLessons]);
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          folder_id: newFolderId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      setShowCreate(false);
      setNewTitle("");
      setNewFolderId("");
      // Navigate to editor
      window.location.href = `/dashboard/lessons/${data.lesson.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lesson and all its segments?")) return;
    try {
      await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
      fetchLessons();
    } catch {
      setError("Failed to delete");
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchLessons();
    } catch {
      setError("Status update failed");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <h1
            className='text-2xl font-bold'
            style={{ color: "var(--text-primary, #F1F1F3)" }}
          >
            Lessons
          </h1>
          <p
            className='text-sm mt-1'
            style={{ color: "var(--text-muted, #6B6F80)" }}
          >
            Create and manage learning content for your students
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className='flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]'
          style={{
            background: "linear-gradient(135deg, #FFE500, #FF9500)",
            color: "#0A0A0F",
          }}
        >
          <Plus size={18} /> New Lesson
        </button>
      </div>

      {error && (
        <div
          className='p-3 rounded-lg text-sm'
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#FCA5A5",
          }}
        >
          {error}
          <button onClick={() => setError(null)} className='ml-2 font-bold'>
            ×
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className='rounded-xl p-6 space-y-4'
          style={{
            backgroundColor: "var(--bg-secondary, #111217)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2
            className='font-semibold'
            style={{ color: "var(--text-primary)" }}
          >
            New Lesson
          </h2>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder='Lesson title...'
            autoFocus
            className='w-full px-3 py-2.5 rounded-lg text-sm outline-none'
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <select
            value={newFolderId}
            onChange={(e) => setNewFolderId(e.target.value)}
            className='w-full px-3 py-2.5 rounded-lg text-sm outline-none'
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)",
            }}
          >
            <option value=''>No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <div className='flex gap-2'>
            <button
              onClick={handleCreate}
              disabled={saving || !newTitle.trim()}
              className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50'
              style={{
                background: "linear-gradient(135deg, #FFE500, #FF9500)",
                color: "#0A0A0F",
              }}
            >
              {saving ? (
                <Loader2 size={16} className='animate-spin' />
              ) : (
                <Plus size={16} />
              )}{" "}
              Create & Edit
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className='px-4 py-2 rounded-lg text-sm hover:bg-white/5'
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className='flex items-center gap-3 flex-wrap'>
        <div className='relative flex-1 min-w-[200px]'>
          <Search
            size={16}
            className='absolute left-3 top-1/2 -translate-y-1/2'
            style={{ color: "var(--text-muted)" }}
          />
          <input
            placeholder='Search lessons...'
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className='w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none'
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className='flex items-center gap-1.5'>
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          {["", "draft", "published", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter({ ...filter, status: s })}
              className='px-3 py-1.5 rounded-lg text-xs font-medium transition-colors'
              style={{
                backgroundColor:
                  filter.status === s ? "rgba(255,229,0,0.1)" : "transparent",
                color:
                  filter.status === s
                    ? "#FFE500"
                    : "var(--text-muted, #6B6F80)",
              }}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        {folders.length > 0 && (
          <select
            value={filter.folder_id}
            onChange={(e) =>
              setFilter({ ...filter, folder_id: e.target.value })
            }
            className='px-3 py-2 rounded-lg text-xs outline-none'
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "var(--text-primary)",
            }}
          >
            <option value=''>All Folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lessons Table */}
      {loading ? (
        <div className='flex justify-center py-16'>
          <Loader2
            size={32}
            className='animate-spin'
            style={{ color: "#FFE500" }}
          />
        </div>
      ) : lessons.length === 0 ? (
        <div
          className='rounded-xl p-12 text-center'
          style={{
            backgroundColor: "var(--bg-secondary, #111217)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <BookOpen
            size={48}
            className='mx-auto mb-4'
            style={{ color: "var(--text-muted)", opacity: 0.4 }}
          />
          <p className='font-medium' style={{ color: "var(--text-muted)" }}>
            No lessons found
          </p>
          <p
            className='text-xs mt-1'
            style={{ color: "var(--text-muted)", opacity: 0.6 }}
          >
            {filter.search || filter.status || filter.folder_id
              ? "Try adjusting your filters."
              : "Create your first lesson to get started."}
          </p>
        </div>
      ) : (
        <div className='space-y-2'>
          {lessons.map((lesson) => {
            const statusCfg = STATUS_CONFIG[lesson.status];
            const StatusIcon = statusCfg.icon;
            const segCount = lesson.segments?.[0]?.count ?? 0;
            return (
              <div
                key={lesson.id}
                className='group flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:scale-[1.005]'
                style={{
                  backgroundColor: "var(--bg-secondary, #111217)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Status badge */}
                <div
                  className='flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0'
                  style={{
                    backgroundColor: statusCfg.bg,
                    color: statusCfg.color,
                  }}
                >
                  <StatusIcon size={12} /> {statusCfg.label}
                </div>

                {/* Title & meta */}
                <div className='flex-1 min-w-0'>
                  <Link
                    href={`/dashboard/lessons/${lesson.id}`}
                    className='font-semibold text-sm hover:underline'
                    style={{ color: "var(--text-primary)" }}
                  >
                    {lesson.title}
                  </Link>
                  <div className='flex items-center gap-3 mt-1'>
                    {lesson.folder && (
                      <span
                        className='text-xs px-2 py-0.5 rounded-full'
                        style={{
                          backgroundColor: `${lesson.folder.color}15`,
                          color: lesson.folder.color,
                        }}
                      >
                        {lesson.folder.name}
                      </span>
                    )}
                    <span
                      className='text-xs'
                      style={{ color: "var(--text-muted)", opacity: 0.6 }}
                    >
                      {segCount} segments
                    </span>
                    <span
                      className='text-xs'
                      style={{ color: "var(--text-muted)", opacity: 0.6 }}
                    >
                      Updated {formatDate(lesson.updated_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
                  {lesson.status === "draft" && (
                    <button
                      onClick={() => handleStatusChange(lesson.id, "published")}
                      className='p-2 rounded-lg hover:bg-green-500/10'
                      title='Publish'
                    >
                      <Globe size={16} style={{ color: "#22C55E" }} />
                    </button>
                  )}
                  {lesson.status === "published" && (
                    <button
                      onClick={() => handleStatusChange(lesson.id, "draft")}
                      className='p-2 rounded-lg hover:bg-yellow-500/10'
                      title='Unpublish'
                    >
                      <Eye size={16} style={{ color: "#F59E0B" }} />
                    </button>
                  )}
                  <Link
                    href={`/dashboard/lessons/${lesson.id}`}
                    className='p-2 rounded-lg hover:bg-white/5'
                    title='Edit'
                  >
                    <Pencil size={16} style={{ color: "var(--text-muted)" }} />
                  </Link>
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    className='p-2 rounded-lg hover:bg-red-500/10'
                    title='Delete'
                  >
                    <Trash2 size={16} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
