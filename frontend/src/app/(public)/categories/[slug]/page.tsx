import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicFetch } from "@/lib/api";
import type { Article, Category, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

export const revalidate = 300;

interface CategoryPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await publicFetch<{ data: Category[] }>("/api/categories");
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
    const res = await publicFetch<PaginatedResponse<Article>>("/api/articles", {
      params: { category: categorySlug, page, per_page: "12" },
    });
    return res;
  } catch {
    return { data: [], total: 0, page: 1, per_page: 12, totalPages: 0 };
  }
}

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === params.slug);

  if (!category) {
    return {
      title: "Danh mục không tồn tại",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/categories/${category.slug}`;
  const title = `${category.name} | Đấu giá ${COMPANY.address.region}`;
  const description =
    `Bài viết trong danh mục ${category.name} — thông báo đấu giá bất động sản và tài sản tại ${COMPANY.address.region}, ` +
    `cập nhật bởi ${COMPANY.legalName}.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      url: `${COMPANY.url}${canonical}`,
      title,
      description,
      siteName: COMPANY.legalName,
      locale: "vi_VN",
      type: "website",
      images: [{ url: `${COMPANY.url}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${COMPANY.url}/opengraph-image`],
    },
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang Chủ", item: COMPANY.url },
      { "@type": "ListItem", position: 2, name: "Thông Báo Đấu Giá", item: `${COMPANY.url}/articles` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${COMPANY.url}/categories/${category.slug}` },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${COMPANY.url}/categories/${category.slug}#collection`,
    name: category.name,
    description: `Thông báo đấu giá thuộc danh mục ${category.name} tại ${COMPANY.address.region}.`,
    isPartOf: { "@id": COMPANY.ids.website },
    publisher: { "@id": COMPANY.ids.organization },
    inLanguage: "vi-VN",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

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
            {articles.total} thông báo đấu giá trong danh mục này — {COMPANY.address.region}
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
    </>
  );
}
