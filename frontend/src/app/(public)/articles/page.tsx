import type { Metadata } from "next";
import { serverFetch } from "@/lib/api";
import type { Article, Category, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { CategoryFilter } from "@/components/category-filter";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Thư Viện Nghiên Cứu",
  description: `Thư viện nghiên cứu thị trường đấu giá bất động sản — ${COMPANY.legalName}, ${COMPANY.address.region}.`,
  alternates: { canonical: "/articles" },
  openGraph: {
    url: `${COMPANY.url}/articles`,
    title: `Thư Viện Nghiên Cứu | ${COMPANY.shortName}`,
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
    const res = await serverFetch<{ data: Category[] }>("/api/categories");
    return res.data;
  } catch {
    return [];
  }
}

async function getArticles(params: Record<string, string>) {
  try {
    const res = await serverFetch<PaginatedResponse<Article>>("/api/articles", {
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

  const fetchParams: Record<string, string> = {
    page,
    per_page: "12",
  };
  if (category) fetchParams.category = category;
  if (province) fetchParams.province = province;

  const [categories, articles] = await Promise.all([
    getCategories(),
    getArticles(fetchParams),
  ]);

  // Build search params for pagination links (exclude page)
  const paginationParams: Record<string, string> = {};
  if (category) paginationParams.category = category;
  if (province) paginationParams.province = province;

  return (
    <div className="container-wide py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-charcoal sm:text-4xl">
          Thư Viện Nghiên Cứu
        </h1>
        <p className="mt-2 font-body text-muted-fg">
          Tổng hợp các bài nghiên cứu thị trường đấu giá bất động sản
        </p>
      </div>

      {/* Category filter bar */}
      <div className="mb-8">
        <CategoryFilter categories={categories} activeSlug={category || null} />
      </div>

      {/* Province filter indicator */}
      {province && (
        <p className="mb-4 font-body text-sm text-muted-fg">
          Lọc theo tỉnh:{" "}
          <span className="font-medium text-charcoal">{province}</span>
        </p>
      )}

      {/* Article grid */}
      {articles.data.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.data.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* Pagination */}
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
        <div className="py-20 text-center">
          <p className="font-heading text-xl text-muted-fg">
            Không tìm thấy bài viết nào
          </p>
          <p className="mt-2 font-body text-sm text-muted-fg">
            Vui lòng thử lại với bộ lọc khác
          </p>
        </div>
      )}
    </div>
  );
}
