"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { clientFetch, type Category } from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New category form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newColor, setNewColor] = useState("#A16207");
  const [newSortOrder, setNewSortOrder] = useState("0");
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchCategories() {
    try {
      const data = await clientFetch<Category[]>("/categories");
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setError("");
    try {
      await clientFetch("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim(),
          color: newColor,
          sortOrder: parseInt(newSortOrder, 10) || 0,
        }),
      });
      setNewName("");
      setNewSlug("");
      setNewColor("#A16207");
      setNewSortOrder("0");
      setShowAdd(false);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm thất bại");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditColor(cat.color);
    setEditSortOrder(String(cat.sortOrder));
  }

  async function saveEdit() {
    if (!editId) return;
    setError("");
    try {
      await clientFetch(`/admin/categories/${editId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim(),
          color: editColor,
          sortOrder: parseInt(editSortOrder, 10) || 0,
        }),
      });
      setEditId(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await clientFetch(`/admin/categories/${id}`, { method: "DELETE" });
      setDeleteId(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá thất bại");
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
          <h1 className="font-heading text-3xl font-bold text-charcoal">
            Danh Mục
          </h1>
          <p className="mt-1 font-body text-sm text-muted-fg">
            Quản lý danh mục bài viết ({categories.length})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-md bg-charcoal px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-gold"
        >
          <Plus className="h-4 w-4" />
          Thêm Danh Mục
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
            Thêm Danh Mục Mới
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                Tên
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Đấu Giá QSD Đất"
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
                placeholder="dau-gia-qsd-dat"
                className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                Màu
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-warm-border"
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                Thứ tự
              </label>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value)}
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

      {/* Categories table */}
      <div className="rounded-lg border border-warm-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-warm-border bg-warm-white">
                <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                  Màu
                </th>
                <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                  Tên
                </th>
                <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                  Slug
                </th>
                <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                  Thứ Tự
                </th>
                <th className="px-6 py-3 text-right font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="transition-colors hover:bg-warm-white"
                >
                  {editId === cat.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-warm-border"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded border border-warm-border px-2 py-1 font-body text-sm outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          className="w-full rounded border border-warm-border px-2 py-1 font-body text-sm outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={editSortOrder}
                          onChange={(e) => setEditSortOrder(e.target.value)}
                          className="w-20 rounded border border-warm-border px-2 py-1 font-body text-sm outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="rounded p-1.5 text-green-600 transition-colors hover:bg-green-50"
                            title="Lưu"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="rounded p-1.5 text-muted-fg transition-colors hover:bg-warm-white"
                            title="Huỷ"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-3">
                        <div
                          className="h-6 w-6 rounded-full border border-warm-border"
                          style={{ backgroundColor: cat.color }}
                        />
                      </td>
                      <td className="px-6 py-3 font-body text-sm font-medium text-charcoal">
                        {cat.name}
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-muted-fg">
                        {cat.slug}
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-muted-fg">
                        {cat.sortOrder}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="rounded p-1.5 text-muted-fg transition-colors hover:bg-warm-white hover:text-charcoal"
                            title="Sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(cat.id)}
                            className="rounded p-1.5 text-muted-fg transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Xoá"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center font-body text-sm text-muted-fg"
                  >
                    Chưa có danh mục nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="font-heading text-lg font-semibold text-charcoal">
              Xác nhận xoá
            </h3>
            <p className="mt-2 font-body text-sm text-muted-fg">
              Bạn có chắc chắn muốn xoá danh mục này? Các bài viết thuộc danh
              mục sẽ không bị xoá.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-warm-border px-4 py-2 font-body text-sm font-medium text-muted-fg hover:bg-warm-white"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                className="rounded-md bg-red-600 px-4 py-2 font-body text-sm font-medium text-white hover:bg-red-700"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
