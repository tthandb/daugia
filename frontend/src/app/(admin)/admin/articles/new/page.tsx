"use client";

import { useState, useEffect, useRef, type FormEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, X } from "lucide-react";
import { clientFetch, type Category } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
];

const ACCEPTED_EXTENSIONS = ".docx,.pdf";

export default function NewArticlePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorName, setAuthorName] = useState("Nguyễn Văn Dương");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    clientFetch<Category[]>("/categories")
      .then(setCategories)
      .catch(() => {});
  }, []);

  function handleFile(f: File) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Chỉ chấp nhận file DOCX hoặc PDF");
      return;
    }
    setFile(f);
    setError("");
    // Auto-fill title from filename (without extension)
    const name = f.name.replace(/\.(docx|pdf)$/i, "").replace(/[-_]/g, " ");
    if (!title) {
      setTitle(name);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }

  function removeFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn file tài liệu");
      return;
    }
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      if (categoryId) formData.append("categoryId", categoryId);
      if (authorName.trim()) formData.append("authorName", authorName.trim());
      if (province.trim()) formData.append("province", province.trim());
      if (district.trim()) formData.append("district", district.trim());

      const res = await fetch("/api/admin/articles", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Tải lên thất bại" }));
        throw new Error(data.error || "Tải lên thất bại");
      }

      const article = await res.json();
      router.push(`/admin/articles/${article.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải lên thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-charcoal">
          Tải Lên Bài Viết Mới
        </h1>
        <p className="mt-1 font-body text-sm text-muted-fg">
          Tải lên file DOCX hoặc PDF để tạo bài viết mới
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag-drop zone */}
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragging
                ? "border-gold bg-gold-pale"
                : "border-warm-border bg-white hover:border-gold hover:bg-gold-pale/30"
            }`}
          >
            <FileUp
              className={`mx-auto h-12 w-12 ${
                dragging ? "text-gold" : "text-muted-fg"
              }`}
            />
            <p className="mt-4 font-body text-sm font-medium text-charcoal">
              Kéo thả file vào đây hoặc nhấn để chọn
            </p>
            <p className="mt-1 font-body text-xs text-muted-fg">
              Chấp nhận DOCX, PDF (tối đa 50MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-warm-border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-pale">
                <Upload className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="font-body text-sm font-medium text-charcoal">
                  {file.name}
                </p>
                <p className="font-body text-xs text-muted-fg">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="rounded p-1 text-muted-fg transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Metadata fields — shown when file is selected */}
        {file && (
          <div className="space-y-4 rounded-lg border border-warm-border bg-white p-6">
            <h2 className="font-heading text-lg font-semibold text-charcoal">
              Thông Tin Bài Viết
            </h2>

            <div>
              <label
                htmlFor="title"
                className="mb-1.5 block font-body text-sm font-medium text-fg"
              >
                Tiêu đề *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-1.5 block font-body text-sm font-medium text-fg"
              >
                Danh mục
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="author"
                className="mb-1.5 block font-body text-sm font-medium text-fg"
              >
                Tác giả
              </label>
              <input
                id="author"
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="province"
                  className="mb-1.5 block font-body text-sm font-medium text-fg"
                >
                  Tỉnh / Thành
                </label>
                <input
                  id="province"
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Vĩnh Phúc"
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
              <div>
                <label
                  htmlFor="district"
                  className="mb-1.5 block font-body text-sm font-medium text-fg"
                >
                  Huyện / Quận
                </label>
                <input
                  id="district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Vĩnh Tường"
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-4 py-3 font-body text-sm text-red-600">
            {error}
          </div>
        )}

        {file && (
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-charcoal px-4 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-gold disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {loading ? "Đang tải lên..." : "Tải Lên & Tạo Bài Viết"}
          </button>
        )}
      </form>
    </div>
  );
}
