"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Upload,
  Pencil,
  Trash2,
  Globe,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  clientFetch,
  type Article,
  type PaginatedResponse,
} from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED";

const statusTabs: { label: string; value: StatusFilter }[] = [
  { label: "Tất Cả", value: "ALL" },
  { label: "Đã Xuất Bản", value: "PUBLISHED" },
  { label: "Bản Nháp", value: "DRAFT" },
  { label: "Lưu Trữ", value: "ARCHIVED" },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-body text-xs font-medium",
        status === "PUBLISHED" && "bg-green-100 text-green-700",
        status === "DRAFT" && "bg-gray-100 text-gray-600",
        status === "ARCHIVED" && "bg-stone-100 text-stone-500"
      )}
    >
      {status === "PUBLISHED"
        ? "Đã Xuất Bản"
        : status === "DRAFT"
        ? "Bản Nháp"
        : "Lưu Trữ"}
    </span>
  );
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: "15",
      };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const data = await clientFetch<PaginatedResponse<Article>>(
        "/admin/articles",
        { params }
      );
      setArticles(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handleDelete(id: string) {
    try {
      await clientFetch(`/admin/articles/${id}`, { method: "DELETE" });
      setDeleteId(null);
      fetchArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá thất bại");
    }
  }

  async function handleTogglePublish(article: Article) {
    try {
      if (article.status === "PUBLISHED") {
        await clientFetch(`/admin/articles/${article.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "DRAFT" }),
        });
      } else {
        await clientFetch(`/admin/articles/${article.id}/publish`, {
          method: "POST",
        });
      }
      fetchArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    }
  }

  function changeFilter(filter: StatusFilter) {
    setStatusFilter(filter);
    setPage(1);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-charcoal">
            Bài Viết
          </h1>
          <p className="mt-1 font-body text-sm text-muted-fg">
            Quản lý tất cả bài viết ({total})
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 rounded-md bg-charcoal px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-gold"
        >
          <Upload className="h-4 w-4" />
          Tải Lên Bài Viết Mới
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-warm-white p-1 border border-warm-border w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => changeFilter(tab.value)}
            className={cn(
              "rounded-md px-4 py-2 font-body text-sm font-medium transition-colors",
              statusFilter === tab.value
                ? "bg-charcoal text-white"
                : "text-muted-fg hover:text-charcoal"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 font-body text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-warm-border bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-border bg-warm-white">
                  <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                    Tiêu Đề
                  </th>
                  <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                    Trạng Thái
                  </th>
                  <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                    Danh Mục
                  </th>
                  <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                    Lượt Xem
                  </th>
                  <th className="px-6 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                    Ngày Tạo
                  </th>
                  <th className="px-6 py-3 text-right font-body text-xs font-medium uppercase tracking-wider text-muted-fg">
                    Hành Động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border">
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className="transition-colors hover:bg-warm-white"
                  >
                    <td className="max-w-xs truncate px-6 py-4 font-body text-sm font-medium text-charcoal">
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="hover:text-gold"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={article.status} />
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-muted-fg">
                      {article.categoryName || "---"}
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-muted-fg">
                      {article.viewCount.toLocaleString("vi-VN")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-body text-sm text-muted-fg">
                      {formatDate(article.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/articles/${article.id}/edit`}
                          className="rounded p-1.5 text-muted-fg transition-colors hover:bg-warm-white hover:text-charcoal"
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(article)}
                          className="rounded p-1.5 text-muted-fg transition-colors hover:bg-warm-white hover:text-charcoal"
                          title={
                            article.status === "PUBLISHED"
                              ? "Gỡ xuất bản"
                              : "Xuất bản"
                          }
                        >
                          {article.status === "PUBLISHED" ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Globe className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(article.id)}
                          className="rounded p-1.5 text-muted-fg transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {articles.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center font-body text-sm text-muted-fg"
                    >
                      Không tìm thấy bài viết nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-warm-border px-6 py-4">
            <p className="font-body text-sm text-muted-fg">
              Trang {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-md border border-warm-border px-3 py-1.5 font-body text-sm text-muted-fg transition-colors hover:bg-warm-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-md border border-warm-border px-3 py-1.5 font-body text-sm text-muted-fg transition-colors hover:bg-warm-white disabled:opacity-40"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="font-heading text-lg font-semibold text-charcoal">
              Xác nhận xoá
            </h3>
            <p className="mt-2 font-body text-sm text-muted-fg">
              Bạn có chắc chắn muốn xoá bài viết này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-warm-border px-4 py-2 font-body text-sm font-medium text-muted-fg transition-colors hover:bg-warm-white"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                className="rounded-md bg-red-600 px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-red-700"
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
