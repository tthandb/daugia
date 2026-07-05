import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { FileSearch, MapPin, X } from "lucide-react";
import { publicFetch } from "@/lib/api";
import type { Article, Category, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { CategoryFilter } from "@/components/category-filter";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

// Provinces present in the data (Phú Thọ, plus legacy Vĩnh Phúc kept as a
// historical record after the 2025 merger). Drives the location filter chips.
const PROVINCES = ["Phú Thọ", "Vĩnh Phúc"];

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Thông Báo Đấu Giá",
  description: `Danh sách thông báo đấu giá do ${COMPANY.legalName} công bố tại ${COMPANY.address.region}.`,
  alternates: { canonical: "/articles" },
  openGraph: {
    url: `${COMPANY.url}/articles`,
    title: `Thông Báo Đấu Giá | ${COMPANY.shortName}`,
    description: `Danh sách thông báo đấu giá do ${COMPANY.legalName} công bố tại ${COMPANY.address.region}.`,
    siteName: COMPANY.legalName,
    locale: "vi_VN",
    type: "website",
    images: [{ url: `${COMPANY.url}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Thông Báo Đấu Giá | ${COMPANY.shortName}`,
    description: `Danh sách thông báo đấu giá do ${COMPANY.legalName} công bố tại ${COMPANY.address.region}.`,
    images: [`${COMPANY.url}/opengraph-image`],
  },
};

interface ArticlesPageProps {
  searchParams: {
    page?: string;
    category?: string;
    province?: string;
  };
}

async function getCategories() {
  try {
    const res = await publicFetch<{ data: Category[] }>("/api/categories");
    return res.data;
  } catch {
    return [];
  }
}

async function getArticles(params: Record<string, string>) {
  try {
    const res = await publicFetch<PaginatedResponse<Article>>("/api/articles", {
      params,
    });
    return res;
  } catch {
    return { data: [], total: 0, page: 1, per_page: 12, totalPages: 0 };
  }
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const page = searchParams.page || "1";
  const category = searchParams.category || "";
  const province = searchParams.province || "";

  // Permanently redirect ?category= to the SEO-friendly path-based route so
  // every category landing has its own canonical, title, and description.
  if (category) {
    const target = `/categories/${category}${page !== "1" ? `?page=${page}` : ""}`;
    permanentRedirect(target);
  }

  const fetchParams: Record<string, string> = {
    page,
    per_page: "12",
  };
  if (province) fetchParams.province = province;

  const [categories, articles] = await Promise.all([
    getCategories(),
    getArticles(fetchParams),
  ]);

  // Build search params for pagination links (exclude page)
  const paginationParams: Record<string, string> = {};
  if (category) paginationParams.category = category;
  if (province) paginationParams.province = province;

  const isFiltered = Boolean(province);

  return (
    <>
      {/* Page header band */}
      <div className="border-b border-line bg-card">
        <div className="container-wide py-8 sm:py-10">
          <p className="eyebrow text-brass-ink">Danh sách công bố</p>
          <h1 className="mt-1.5 font-heading text-3xl font-bold text-ink sm:text-4xl">
            Thông báo đấu giá
          </h1>
          <p className="mt-2 max-w-2xl font-body text-ink-soft">
            Toàn bộ thông báo đấu giá do {COMPANY.shortName} tổ chức và công bố
            tại {COMPANY.address.region}.
          </p>
        </div>
      </div>

      <div className="container-wide py-8">
        {/* Filters */}
        <div className="space-y-4">
          <CategoryFilter categories={categories} activeSlug={category || null} />

          {/* Province filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow inline-flex items-center gap-1.5 pr-1">
              <MapPin className="h-3.5 w-3.5" />
              Khu vực
            </span>
            {PROVINCES.map((p) => {
              const active = province === p;
              return (
                <Link
                  key={p}
                  href={active ? "/articles" : `/articles?province=${encodeURIComponent(p)}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-body text-sm transition-colors ${
                    active
                      ? "bg-pine text-paper"
                      : "border border-line bg-card text-ink-soft hover:border-pine/40 hover:text-pine"
                  }`}
                >
                  {p}
                  {active && <X className="h-3.5 w-3.5" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Result count */}
        <p className="mt-6 font-body text-sm text-ink-faint">
          {articles.total > 0 ? (
            <>
              <span className="data font-semibold text-ink">
                {articles.total.toLocaleString("vi-VN")}
              </span>{" "}
              thông báo
              {isFiltered && (
                <>
                  {" "}
                  · <span className="text-ink-soft">{province}</span>
                </>
              )}
            </>
          ) : null}
        </p>

        {/* Article grid */}
        {articles.data.length > 0 ? (
          <>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.data.map((article, idx) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  priority={idx === 0}
                />
              ))}
            </div>
            <div className="mt-12">
              <Pagination
                currentPage={articles.page}
                totalPages={articles.totalPages}
                basePath="/articles"
                params={paginationParams}
              />
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-line bg-card py-20 text-center">
            <FileSearch className="h-10 w-10 text-ink-faint" strokeWidth={1.5} />
            <p className="mt-4 font-heading text-lg font-semibold text-ink">
              Chưa có thông báo phù hợp
            </p>
            <p className="mt-1 max-w-sm font-body text-sm text-ink-soft">
              {isFiltered
                ? "Không có thông báo nào ở khu vực này. Thử bỏ bộ lọc để xem tất cả."
                : "Hiện chưa có thông báo đấu giá nào được công bố."}
            </p>
            {isFiltered && (
              <Link
                href="/articles"
                className="mt-5 inline-flex items-center rounded-lg bg-pine px-5 py-2.5 font-body text-sm font-semibold text-paper transition-colors hover:bg-brass"
              >
                Xem tất cả thông báo
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
