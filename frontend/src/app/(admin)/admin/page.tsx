"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Eye, Upload, CheckCircle, FilePlus } from "lucide-react";
import { clientFetch, type AdminStats, type Article, type PaginatedResponse } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, articlesData] = await Promise.all([
          clientFetch<{ data: AdminStats }>("/admin/stats"),
          clientFetch<PaginatedResponse<Article>>("/admin/articles", {
            params: { per_page: "5" },
          }),
        ]);
        setStats(statsRes.data);
        setArticles(articlesData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 font-body text-sm text-red-600">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      label: "Tổng Bài Viết",
      value: stats?.totalArticles ?? 0,
      icon: FileText,
    },
    {
      label: "Đã Xuất Bản",
      value: stats?.published ?? 0,
      icon: CheckCircle,
    },
    {
      label: "Bản Nháp",
      value: stats?.drafts ?? 0,
      icon: FilePlus,
    },
    {
      label: "Tổng Lượt Xem",
      value: stats?.totalViews ?? 0,
      icon: Eye,
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-charcoal">
            Tổng Quan
          </h1>
          <p className="mt-1 font-body text-sm text-muted-fg">
            Bảng điều khiển quản trị hệ thống
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 rounded-md bg-charcoal px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-gold"
        >
          <Upload className="h-4 w-4" />
          Tải Lên Bài Viết
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg border border-warm-border border-l-4 border-l-gold bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm text-muted-fg">
                    {card.label}
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold text-charcoal">
                    {card.value.toLocaleString("vi-VN")}
                  </p>
                </div>
                <Icon className="h-8 w-8 text-gold/50" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent articles table */}
      <div className="rounded-lg border border-warm-border bg-white shadow-sm">
        <div className="border-b border-warm-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-charcoal">
            Bài Viết Gần Đây
          </h2>
        </div>
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
                  <td className="px-6 py-4 font-body text-sm text-muted-fg">
                    {formatDate(article.createdAt)}
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center font-body text-sm text-muted-fg"
                  >
                    Chưa có bài viết nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
