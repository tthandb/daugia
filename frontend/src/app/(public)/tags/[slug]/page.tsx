import type { Metadata } from "next";
import { serverFetch } from "@/lib/api";
import type { Article, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

interface TagPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

async function getArticlesByTag(
  tagSlug: string,
  page: string
): Promise<PaginatedResponse<Article>> {
  try {
    const res = await serverFetch<PaginatedResponse<Article>>("/api/articles", {
      params: { tag: tagSlug, page, per_page: "12" },
    });
    return res;
  } catch {
    return { data: [], total: 0, page: 1, per_page: 12, totalPages: 0 };
  }
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  // Tag name from slug (decode dashes)
  const tagName = decodeURIComponent(params.slug).replace(/-/g, " ");

  return {
    title: `#${tagName}`,
    description: `Thông báo đấu giá gắn thẻ "${tagName}" — ${COMPANY.shortName}.`,
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const page = searchParams.page || "1";
  const articles = await getArticlesByTag(params.slug, page);

  const tagName = decodeURIComponent(params.slug).replace(/-/g, " ");

  return (
    <div className="container-wide py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-charcoal sm:text-4xl">
          #{tagName}
        </h1>
        <p className="mt-2 font-body text-muted-fg">
          {articles.total} bài viết gắn thẻ này
        </p>
      </div>

      {/* Article grid */}
      {articles.data.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.data.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          <div className="mt-12">
            <Pagination
              currentPage={articles.page}
              totalPages={articles.totalPages}
              basePath={`/tags/${params.slug}`}
            />
          </div>
        </>
      ) : (
        <div className="py-20 text-center">
          <p className="font-heading text-xl text-muted-fg">
            Chưa có bài viết nào gắn thẻ này
          </p>
        </div>
      )}
    </div>
  );
}
