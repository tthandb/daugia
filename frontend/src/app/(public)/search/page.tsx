import type { Metadata } from "next";
import { Search } from "lucide-react";
import { serverFetch } from "@/lib/api";
import type { Article, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Tìm Kiếm",
  description: "Tìm kiếm thông báo đấu giá theo từ khoá, địa điểm hoặc loại tài sản",
  alternates: { canonical: "/search" },
  // Search-result pages should not be indexed — they create endless duplicate
  // listings keyed on user query and dilute the canonical /articles equity.
  robots: { index: false, follow: true },
  openGraph: {
    url: `${COMPANY.url}/search`,
    title: `Tìm Kiếm | ${COMPANY.shortName}`,
    description: "Tìm kiếm thông báo đấu giá theo từ khoá, địa điểm hoặc loại tài sản",
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
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow text-brass-ink">Tra cứu</p>
        <h1 className="mt-1.5 font-heading text-3xl font-bold text-ink sm:text-4xl">
          Tìm kiếm thông báo
        </h1>

        {/* Search form */}
        <form action="/search" method="GET" role="search" className="mt-6">
          <label htmlFor="q" className="sr-only">
            Từ khoá tìm kiếm
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-card p-2 focus-within:border-pine/50">
            <Search className="ml-2 h-5 w-5 shrink-0 text-ink-faint" aria-hidden />
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Địa điểm, loại tài sản, số thông báo…"
              className="min-w-0 flex-1 bg-transparent font-body text-base text-ink placeholder:text-ink-faint focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-pine px-5 py-2.5 font-body text-sm font-semibold text-paper transition-colors hover:bg-brass"
            >
              Tìm
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="mt-10">
        {results ? (
          <>
            {q && (
              <p className="mb-6 font-body text-sm text-ink-soft">
                {results.total > 0 ? (
                  <>
                    <span className="data font-semibold text-ink">
                      {results.total.toLocaleString("vi-VN")}
                    </span>{" "}
                    kết quả cho “{q}”
                  </>
                ) : (
                  <>Không tìm thấy kết quả cho “{q}”</>
                )}
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
                <div className="rounded-xl border border-dashed border-line bg-card py-20 text-center">
                  <Search className="mx-auto h-10 w-10 text-ink-faint" strokeWidth={1.5} />
                  <p className="mt-4 font-heading text-lg font-semibold text-ink">
                    Không tìm thấy kết quả
                  </p>
                  <p className="mt-1 font-body text-sm text-ink-soft">
                    Thử lại với từ khoá khác hoặc xem tất cả thông báo.
                  </p>
                </div>
              )
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-card py-20 text-center">
            <Search className="mx-auto h-10 w-10 text-ink-faint" strokeWidth={1.5} />
            <p className="mt-4 font-body text-ink-soft">
              Nhập từ khoá để bắt đầu tìm kiếm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
