import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api";
import type { Article, Category, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Pagination } from "@/components/pagination";

interface CategoryPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await serverFetch<{ data: Category[] }>("/api/categories");
    return res.data;
  } catch {
    return [];
  }
}

async function getArticlesByCategory(
  categorySlug: string,
  page: string
): Promise<PaginatedResponse<Article>> {
  try {
    const res = await serverFetch<PaginatedResponse<Article>>("/api/articles", {
      params: { category: categorySlug, page, per_page: "12" },
    });
    return res;
  } catch {
    return { data: [], total: 0, page: 1, per_page: 12, totalPages: 0 };
  }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === params.slug);

  if (!category) {
    return { title: "Danh mục không tồn tại" };
  }

  return {
    title: category.name,
    description: `Bài viết trong danh mục ${category.name} - Nghiên cứu đấu giá bất động sản`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const page = searchParams.page || "1";

  const [categories, articles] = await Promise.all([
    getCategories(),
    getArticlesByCategory(params.slug, page),
  ]);

  const category = categories.find((c) => c.slug === params.slug);
  if (!category) {
    notFound();
  }

  return (
    <div className="container-wide py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h1 className="font-heading text-3xl font-bold text-charcoal sm:text-4xl">
            {category.name}
          </h1>
        </div>
        <p className="mt-2 font-body text-muted-fg">
          {articles.total} bài viết trong danh mục này
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
              basePath={`/categories/${params.slug}`}
            />
          </div>
        </>
      ) : (
        <div className="py-20 text-center">
          <p className="font-heading text-xl text-muted-fg">
            Chưa có bài viết nào trong danh mục này
          </p>
        </div>
      )}
    </div>
  );
}
