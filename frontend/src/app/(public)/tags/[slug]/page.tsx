import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Tag as TagIcon } from "lucide-react";
import { publicFetch } from "@/lib/api";
import type { Article, Tag, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Pagination } from "@/components/pagination";
import { COMPANY } from "@/lib/company";

export const revalidate = 300;

interface TagPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

// Resolve the real tag record by slug so the page shows the correct Vietnamese
// name ("Vĩnh Phúc") instead of a diacritic-stripped reconstruction from the slug
// ("vinh phuc"). Returns null when the tag doesn't exist.
async function getTag(slug: string): Promise<Tag | null> {
  const res = await publicFetch<{ data: Tag[] }>("/api/tags");
  return res.data.find((t) => t.slug === slug) ?? null;
}

async function getArticlesByTag(
  tagSlug: string,
  page: string,
): Promise<PaginatedResponse<Article>> {
  return publicFetch<PaginatedResponse<Article>>("/api/articles", {
    params: { tag: tagSlug, page, per_page: "12" },
  });
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const tag = await getTag(params.slug).catch(() => null);
  const name = tag?.name ?? params.slug;
  return {
    title: `#${name}`,
    description: `Thông báo đấu giá gắn thẻ "${name}" — ${COMPANY.shortName}.`,
    alternates: { canonical: `/tags/${params.slug}` },
    robots: tag ? undefined : { index: false, follow: true },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const page = searchParams.page || "1";
  const [tag, articles] = await Promise.all([
    getTag(params.slug),
    getArticlesByTag(params.slug, page),
  ]);

  if (!tag) {
    notFound();
  }

  return (
    <>
      <div className="border-b border-line bg-card">
        <div className="container-wide py-8 sm:py-10">
          <p className="eyebrow inline-flex items-center gap-1.5 text-brass-ink">
            <TagIcon className="h-3.5 w-3.5" />
            Thẻ
          </p>
          <h1 className="mt-1.5 font-heading text-3xl font-bold text-ink sm:text-4xl">
            {tag.name}
          </h1>
          <p className="mt-2 font-body text-ink-soft">
            <span className="data font-semibold text-ink">{articles.total}</span>{" "}
            thông báo gắn thẻ này
          </p>
        </div>
      </div>

      <div className="container-wide py-8">
        {articles.data.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                basePath={`/tags/${params.slug}`}
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-card py-20 text-center">
            <p className="font-heading text-lg font-semibold text-ink">
              Chưa có thông báo nào gắn thẻ này
            </p>
          </div>
        )}
      </div>
    </>
  );
}
