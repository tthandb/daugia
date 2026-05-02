import type { Metadata } from "next";
import { Search } from "lucide-react";
import { serverFetch } from "@/lib/api";
import type { Article, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Tìm Kiếm",
  description: "Tìm kiếm bài viết nghiên cứu thị trường đấu giá bất động sản",
  alternates: { canonical: "/search" },
  // Search-result pages should not be indexed — they create endless duplicate
  // listings keyed on user query and dilute the canonical /articles equity.
  robots: { index: false, follow: true },
  openGraph: {
    url: `${COMPANY.url}/search`,
    title: `Tìm Kiếm | ${COMPANY.shortName}`,
    description: "Tìm kiếm bài viết nghiên cứu thị trường đấu giá bất động sản",
    siteName: COMPANY.legalName,
    locale: "vi_VN",
    type: "website",
  },
};

interface SearchPageProps {
  searchParams: {
    q?: string;
    page?: string;
  };
}

async function searchArticles(q: string, page: string) {
  try {
    const res = await serverFetch<PaginatedResponse<Article>>("/api/search", {
      params: { q, page, per_page: "12" },
    });
    return res;
  } catch {
    return { data: [], total: 0, page: 1, per_page: 12, totalPages: 0 };
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = searchParams.q || "";
  const page = searchParams.page || "1";

  const results = q ? await searchArticles(q, page) : null;

  return (
    <div className="container-wide py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-charcoal sm:text-4xl">
          Tìm Kiếm
        </h1>
      </div>

      {/* Search form */}
      <form action="/search" method="GET" className="mb-10">
        <div className="relative mx-auto max-w-2xl">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Nhập từ khóa tìm kiếm..."
            className="w-full border-0 border-b-2 border-warm-border bg-transparent py-4 font-body text-xl text-charcoal placeholder:text-muted-fg/50 focus:border-gold focus:outline-none focus:ring-0"
            autoComplete="off"
          />
          <button
            type="submit"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-fg transition-colors hover:text-gold"
            aria-label="Tìm kiếm"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Results */}
      {results ? (
        <>
          {q && (
            <p className="mb-6 font-body text-sm text-muted-fg">
              {results.total > 0
                ? `Tìm thấy ${results.total} kết quả cho "${q}"`
                : `Không tìm thấy kết quả cho "${q}"`}
            </p>
          )}

          {results.data.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.data.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

              <div className="mt-12">
                <Pagination
                  currentPage={results.page}
                  totalPages={results.totalPages}
                  basePath="/search"
                  params={{ q }}
                />
              </div>
            </>
          ) : (
            q && (
              <div className="py-20 text-center">
                <Search className="mx-auto h-12 w-12 text-warm-border" />
                <p className="mt-4 font-heading text-xl text-muted-fg">
                  Không tìm thấy kết quả
                </p>
                <p className="mt-2 font-body text-sm text-muted-fg">
                  Vui lòng thử lại với từ khóa khác
                </p>
              </div>
            )
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          <Search className="mx-auto h-12 w-12 text-warm-border" />
          <p className="mt-4 font-body text-muted-fg">
            Nhập từ khóa để bắt đầu tìm kiếm
          </p>
        </div>
      )}
    </div>
  );
}
