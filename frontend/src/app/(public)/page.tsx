import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { serverFetch } from "@/lib/api";
import type { Article, Category, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: {
    absolute: `${COMPANY.legalName} — ${COMPANY.tagline}`,
  },
  description:
    `${COMPANY.legalName} — đấu giá bất động sản tại ${COMPANY.address.region}. ` +
    `Cổng nghiên cứu thị trường cho nhà đầu tư & chuyên gia đấu giá.`,
  alternates: { canonical: "/" },
  openGraph: {
    url: COMPANY.url,
    title: COMPANY.legalName,
    description: `${COMPANY.tagline} — ${COMPANY.legalName}.`,
  },
};

async function getFeaturedArticles() {
  try {
    const res = await serverFetch<{ data: Article[] }>(
      "/api/articles/featured?limit=3"
    );
    return res.data;
  } catch {
    return [];
  }
}

async function getLatestArticles() {
  try {
    const res = await serverFetch<PaginatedResponse<Article>>(
      "/api/articles?per_page=6"
    );
    return res.data;
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    const res = await serverFetch<{ data: Category[] }>("/api/categories");
    return res.data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([
    getFeaturedArticles(),
    getLatestArticles(),
    getCategories(),
  ]);

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-charcoal py-24 sm:py-32">
        <div className="absolute inset-0 bg-[url('/grain.png')] opacity-5" />
        <div className="container-wide relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.25em] text-gold sm:text-sm">
              {COMPANY.legalNameUpper}
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Nghiên Cứu Thị Trường Đấu Giá Bất Động Sản
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-body text-lg text-stone-400 leading-relaxed">
              Cổng thông tin nghiên cứu chuyên sâu về thị trường đấu giá bất
              động sản tại {COMPANY.address.region}, phục vụ nhà đầu tư và
              chuyên gia trong ngành.
            </p>
            <Link
              href="/articles"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gold px-8 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-gold-light"
            >
              Khám Phá Nghiên Cứu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featured.length > 0 && (
        <section className="py-16">
          <div className="container-wide">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-heading text-3xl font-bold text-charcoal">
                  Nổi Bật
                </h2>
                <p className="mt-2 font-body text-muted-fg">
                  Bài viết nghiên cứu được quan tâm nhất
                </p>
              </div>
              <Link
                href="/articles"
                className="hidden items-center gap-1 font-body text-sm font-medium text-gold transition-colors hover:text-gold-light sm:inline-flex"
              >
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Pills */}
      {categories.length > 0 && (
        <section className="border-y border-warm-border bg-stone-50 py-12">
          <div className="container-wide">
            <h2 className="text-center font-heading text-2xl font-bold text-charcoal">
              Danh Mục
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/articles?category=${cat.slug}`}
                  className="inline-flex items-center rounded-full border border-warm-border bg-white px-5 py-2 font-body text-sm font-medium text-charcoal transition-all hover:-translate-y-0.5 hover:border-gold hover:text-gold hover:shadow-sm"
                >
                  <span
                    className="mr-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles */}
      {latest.length > 0 && (
        <section className="py-16">
          <div className="container-wide">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-heading text-3xl font-bold text-charcoal">
                  Mới Nhất
                </h2>
                <p className="mt-2 font-body text-muted-fg">
                  Các bài viết nghiên cứu mới nhất
                </p>
              </div>
              <Link
                href="/articles"
                className="hidden items-center gap-1 font-body text-sm font-medium text-gold transition-colors hover:text-gold-light sm:inline-flex"
              >
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
