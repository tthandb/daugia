"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, FileText, CheckCircle, FilePlus, Archive } from "lucide-react";
import {
  clientFetch,
  type AdminStats,
  type Article,
  type Category,
  type PaginatedResponse,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface CategoryBreakdown {
  id: string | null;
  name: string;
  color: string;
  count: number;
  views: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topArticles, setTopArticles] = useState<Article[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    CategoryBreakdown[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, articlesRes, categoriesRes] = await Promise.all([
          clientFetch<{ data: AdminStats }>("/admin/stats"),
          clientFetch<PaginatedResponse<Article>>("/admin/articles", {
            params: { per_page: "100" },
          }),
          clientFetch<{ data: Category[] }>("/categories"),
        ]);

        setStats(statsRes.data);

        const allArticles = articlesRes.data;
        const sorted = [...allArticles].sort(
          (a, b) => b.viewCount - a.viewCount
        );
        setTopArticles(sorted.slice(0, 10));

        const byName = new Map<string, CategoryBreakdown>();
        for (const c of categoriesRes.data) {
          byName.set(c.name, {
            id: c.id,
            name: c.name,
            color: c.color,
            count: 0,
            views: 0,
          });
        }
        const uncategorized: CategoryBreakdown = {
          id: null,
          name: "Chưa phân loại",
          color: "#78716C",
          count: 0,
          views: 0,
        };
        for (const a of allArticles) {
          const target =
            (a.categoryName && byName.get(a.categoryName)) || uncategorized;
          target.count += 1;
          target.views += a.viewCount;
        }
        const breakdown = Array.from(byName.values()).filter(
          (c) => c.count > 0
        );
        if (uncategorized.count > 0) breakdown.push(uncategorized);
        breakdown.sort((a, b) => b.count - a.count);
        setCategoryBreakdown(breakdown);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    load();
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
    { label: "Tổng Lượt Xem", value: stats?.totalViews ?? 0, icon: Eye },
    { label: "Tổng Bài Viết", value: stats?.totalArticles ?? 0, icon: FileText },
    { label: "Đã Xuất Bản", value: stats?.published ?? 0, icon: CheckCircle },
    { label: "Bản Nháp", value: stats?.drafts ?? 0, icon: FilePlus },
    { label: "Lưu Trữ", value: stats?.archived ?? 0, icon: Archive },
  ];

  const maxCategoryCount = Math.max(
    1,
    ...categoryBreakdown.map((c) => c.count)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-charcoal">
          Phân Tích
        </h1>
        <p className="mt-1 font-body text-sm text-muted-fg">
          Số liệu lượt xem và phân bố nội dung
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg border border-warm-border border-l-4 border-l-gold bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-xs text-muted-fg">
                    {card.label}
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold text-charcoal">
                    {card.value.toLocaleString("vi-VN")}
                  </p>
                </div>
                <Icon className="h-7 w-7 text-gold/50" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-warm-border bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-warm-border px-6 py-4">
            <h2 className="font-heading text-lg font-semibold text-charcoal">
              Bài Viết Phổ Biến
            </h2>
            <p className="mt-1 font-body text-xs text-muted-fg">
              10 bài có lượt xem cao nhất
            </p>
          </div>
          <div className="divide-y divide-warm-border">
            {topArticles.map((a, i) => (
              <Link
                key={a.id}
                href={`/admin/articles/${a.id}/edit`}
                className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-warm-white"
              >
                <span className="w-6 flex-shrink-0 font-heading text-sm font-semibold text-muted-fg">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-medium text-charcoal">
                    {a.title}
                  </p>
                  <p className="font-body text-xs text-muted-fg">
                    {a.categoryName || "—"} · {formatDate(a.createdAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5 font-body text-sm tabular-nums text-charcoal">
                  <Eye className="h-4 w-4 text-muted-fg" />
                  {a.viewCount.toLocaleString("vi-VN")}
                </div>
              </Link>
            ))}
            {topArticles.length === 0 && (
              <div className="px-6 py-8 text-center font-body text-sm text-muted-fg">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-warm-border bg-white shadow-sm">
          <div className="border-b border-warm-border px-6 py-4">
            <h2 className="font-heading text-lg font-semibold text-charcoal">
              Theo Danh Mục
            </h2>
            <p className="mt-1 font-body text-xs text-muted-fg">
              Phân bố bài viết
            </p>
          </div>
          <div className="space-y-4 px-6 py-4">
            {categoryBreakdown.map((c) => (
              <div key={c.id ?? "none"}>
                <div className="mb-1 flex items-center justify-between font-body text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-warm-border"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-charcoal">{c.name}</span>
                  </div>
                  <span className="tabular-nums text-muted-fg">
                    {c.count} · {c.views.toLocaleString("vi-VN")} lượt
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-warm-white">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.count / maxCategoryCount) * 100}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
              </div>
            ))}
            {categoryBreakdown.length === 0 && (
              <p className="text-center font-body text-sm text-muted-fg">
                Chưa có dữ liệu
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
