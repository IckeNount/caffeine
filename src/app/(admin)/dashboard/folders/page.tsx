"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  lessons: { count: number }[];
}

const PRESET_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#22C55E",
  "#06B6D4",
  "#6366F1",
];

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/folders");
      const data = await res.json();
      if (res.ok) setFolders(data.folders || []);
      else setError(data.error);
    } catch {
      setError("Failed to load folders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  async function handleSave() {
    if (!formData.name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const url = editingId
        ? `/api/admin/folders/${editingId}`
        : "/api/admin/folders";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setShowCreate(false);
      setEditingId(null);
      setFormData({ name: "", description: "", color: "#3B82F6" });
      fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this folder? Lessons inside will be unassigned."))
      return;
    try {
      const res = await fetch(`/api/admin/folders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchFolders();
    } catch {
      setError("Failed to delete folder");
    }
  }

  function startEdit(folder: Folder) {
    setEditingId(folder.id);
    setFormData({
      name: folder.name,
      description: folder.description || "",
      color: folder.color,
    });
    setShowCreate(true);
  }

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1
            className='text-2xl font-bold'
            style={{ color: "var(--text-primary, #F1F1F3)" }}
          >
            Folders
          </h1>
          <p
            className='text-sm mt-1'
            style={{ color: "var(--text-muted, #6B6F80)" }}
          >
            Organize your lessons into categories
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setFormData({ name: "", description: "", color: "#3B82F6" });
          }}
          className='flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]'
          style={{
            background: "linear-gradient(135deg, #FFE500, #FF9500)",
            color: "#0A0A0F",
          }}
        >
          <Plus size={18} /> New Folder
        </button>
      </div>

      {/* Error */}
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

      {/* Create/Edit Modal */}
      {showCreate && (
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
              style={{ color: "var(--text-primary, #F1F1F3)" }}
            >
              {editingId ? "Edit Folder" : "New Folder"}
            </h2>
            <button
              onClick={() => {
                setShowCreate(false);
                setEditingId(null);
              }}
              className='p-1 rounded hover:bg-white/5'
            >
              <X size={18} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          <div>
            <label
              className='text-xs font-medium mb-1.5 block'
              style={{ color: "var(--text-muted, #6B6F80)" }}
            >
              Name
            </label>
            <input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder='e.g. Grammar Lessons'
              className='w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-1'
              style={
                {
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-primary, #F1F1F3)",
                  "--tw-ring-color": "#FFE500",
                } as React.CSSProperties
              }
            />
          </div>

          <div>
            <label
              className='text-xs font-medium mb-1.5 block'
              style={{ color: "var(--text-muted, #6B6F80)" }}
            >
              Description
            </label>
            <input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder='Optional description'
              className='w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-1'
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-primary, #F1F1F3)",
              }}
            />
          </div>

          <div>
            <label
              className='text-xs font-medium mb-1.5 block'
              style={{ color: "var(--text-muted, #6B6F80)" }}
            >
              Color
            </label>
            <div className='flex gap-2'>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormData({ ...formData, color: c })}
                  className='w-8 h-8 rounded-lg transition-all'
                  style={{
                    backgroundColor: c,
                    border:
                      formData.color === c
                        ? "2px solid #FFF"
                        : "2px solid transparent",
                    transform:
                      formData.color === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          <div className='flex gap-2 pt-2'>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50'
              style={{
                background: "linear-gradient(135deg, #FFE500, #FF9500)",
                color: "#0A0A0F",
              }}
            >
              {saving ? (
                <Loader2 size={16} className='animate-spin' />
              ) : (
                <Check size={16} />
              )}
              {editingId ? "Update" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setEditingId(null);
              }}
              className='px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5'
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Folders Grid */}
      {loading ? (
        <div className='flex justify-center py-16'>
          <Loader2
            size={32}
            className='animate-spin'
            style={{ color: "#FFE500" }}
          />
        </div>
      ) : folders.length === 0 ? (
        <div
          className='rounded-xl p-12 text-center'
          style={{
            backgroundColor: "var(--bg-secondary, #111217)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <FolderOpen
            size={48}
            className='mx-auto mb-4'
            style={{ color: "var(--text-muted)", opacity: 0.4 }}
          />
          <p
            className='font-medium'
            style={{ color: "var(--text-muted, #6B6F80)" }}
          >
            No folders yet
          </p>
          <p
            className='text-sm mt-1'
            style={{ color: "var(--text-muted)", opacity: 0.6 }}
          >
            Create your first folder to organize lessons.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {folders.map((folder) => (
            <div
              key={folder.id}
              className='group rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]'
              style={{
                backgroundColor: "var(--bg-secondary, #111217)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className='flex items-start justify-between mb-3'>
                <div
                  className='w-10 h-10 rounded-lg flex items-center justify-center'
                  style={{
                    backgroundColor: `${folder.color}20`,
                    color: folder.color,
                  }}
                >
                  <FolderOpen size={20} />
                </div>
                <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    onClick={() => startEdit(folder)}
                    className='p-1.5 rounded-md hover:bg-white/5'
                    title='Edit'
                  >
                    <Pencil size={14} style={{ color: "var(--text-muted)" }} />
                  </button>
                  <button
                    onClick={() => handleDelete(folder.id)}
                    className='p-1.5 rounded-md hover:bg-red-500/10'
                    title='Delete'
                  >
                    <Trash2 size={14} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              </div>
              <h3
                className='font-semibold text-sm'
                style={{ color: "var(--text-primary, #F1F1F3)" }}
              >
                {folder.name}
              </h3>
              {folder.description && (
                <p
                  className='text-xs mt-1 line-clamp-2'
                  style={{ color: "var(--text-muted, #6B6F80)" }}
                >
                  {folder.description}
                </p>
              )}
              <p
                className='text-xs mt-3'
                style={{ color: "var(--text-muted)", opacity: 0.6 }}
              >
                {folder.lessons?.[0]?.count ?? 0} lessons
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
