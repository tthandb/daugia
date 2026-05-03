"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { clientFetch, type Tag } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New tag form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteTarget = deleteId ? tags.find((t) => t.id === deleteId) : null;

  async function fetchTags() {
    try {
      const res = await clientFetch<{ data: Tag[] }>("/tags");
      setTags(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTags();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setError("");
    try {
      await clientFetch("/admin/tags", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim(),
        }),
      });
      setNewName("");
      setNewSlug("");
      setShowAdd(false);
      await fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm thất bại");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    setDeleting(true);
    try {
      await clientFetch(`/admin/tags/${id}`, { method: "DELETE" });
      setDeleteId(null);
      await fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá thất bại");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-charcoal">Thẻ</h1>
          <p className="mt-1 font-body text-sm text-muted-fg">
            Quản lý thẻ gắn bài viết ({tags.length})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-md bg-charcoal px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-gold"
        >
          <Plus className="h-4 w-4" />
          Thêm Thẻ
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 font-body text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-lg border border-warm-border bg-white p-6"
        >
          <h2 className="mb-4 font-heading text-lg font-semibold text-charcoal">
            Thêm Thẻ Mới
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                Tên
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Phú Thọ"
                className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                Slug
              </label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                required
                placeholder="vinh-phuc"
                className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={addLoading}
              className="rounded-md bg-charcoal px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-gold disabled:opacity-50"
            >
              {addLoading ? "Đang thêm..." : "Thêm"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-md border border-warm-border px-4 py-2 font-body text-sm font-medium text-muted-fg hover:bg-warm-white"
            >
              Huỷ
            </button>
          </div>
        </form>
      )}

      {/* Tags list */}
      <div className="rounded-lg border border-warm-border bg-white shadow-sm">
        <div className="divide-y divide-warm-border">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-warm-white"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full border border-warm-border bg-warm-white px-3 py-1 font-body text-sm font-medium text-charcoal">
                  {tag.name}
                </span>
                <span className="font-body text-xs text-muted-fg">
                  {tag.slug}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteId(tag.id)}
                className="rounded p-1.5 text-muted-fg transition-colors hover:bg-red-50 hover:text-red-600"
                title="Xoá"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <div className="px-6 py-8 text-center font-body text-sm text-muted-fg">
              Chưa có thẻ nào
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Xoá thẻ"
        description={
          <>
            Bạn có chắc chắn muốn xoá thẻ
            {deleteTarget ? (
              <>
                {" "}
                <span className="font-medium text-charcoal">
                  &ldquo;{deleteTarget.name}&rdquo;
                </span>
              </>
            ) : (
              " này"
            )}
            ? Thẻ sẽ bị gỡ khỏi tất cả bài viết đang sử dụng.
          </>
        }
        confirmLabel="Xoá"
        destructive
        loading={deleting}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
