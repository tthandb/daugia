import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { publicFetch } from "@/lib/api";
import type { Article, Category, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { CategoryFilter } from "@/components/category-filter";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

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

  return (
    <div className="container-wide py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-charcoal sm:text-4xl">
          Thông Báo Đấu Giá
        </h1>
        <p className="mt-2 font-body text-muted-fg">
          Toàn bộ thông báo đấu giá do {COMPANY.shortName} tổ chức và công bố
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
