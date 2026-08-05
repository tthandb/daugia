import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, MapPin } from "lucide-react";
import { publicFetch } from "@/lib/api";
import type { Article, Category, PaginatedResponse } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { COMPANY } from "@/lib/company";

export const revalidate = 300;

export const metadata: Metadata = {
  title: {
    absolute: `${COMPANY.legalName} — ${COMPANY.tagline}`,
  },
  description:
    `${COMPANY.legalName} — công bố thông báo đấu giá bất động sản, quyền sử dụng đất và tài sản ` +
    `tại ${COMPANY.address.region}.`,
  alternates: { canonical: "/" },
  openGraph: {
    url: COMPANY.url,
    title: COMPANY.legalName,
    description: `${COMPANY.tagline} — ${COMPANY.legalName}.`,
    siteName: COMPANY.legalName,
    locale: "vi_VN",
    type: "website",
    images: [{ url: `${COMPANY.url}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: COMPANY.legalName,
    description: `${COMPANY.tagline} — ${COMPANY.legalName}.`,
    images: [`${COMPANY.url}/opengraph-image`],
  },
};

// These deliberately do NOT swallow errors. Under ISR, a fetch that throws
// during background revalidation makes Next keep serving the last good page,
// whereas returning [] would succeed and bake an empty homepage into the cache.
// A genuine 200 with no articles still returns [] and renders normally.
async function getFeaturedArticles() {
  const res = await publicFetch<{ data: Article[] }>(
    "/api/articles/featured?limit=3"
  );
  return res.data;
}

async function getLatestArticles() {
  const res = await publicFetch<PaginatedResponse<Article>>(
    "/api/articles?per_page=6"
  );
  return res.data;
}

async function getCategories() {
  const res = await publicFetch<{ data: Category[] }>("/api/categories");
  return res.data;
}

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([
    getFeaturedArticles(),
    getLatestArticles(),
    getCategories(),
  ]);

  return (
    <>
      {/* Hero — official gazette masthead */}
      <section className="relative overflow-hidden bg-pine-deep">
        {/* soft radial + hairline texture */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(154,107,30,0.14),transparent_60%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
        />
        <div className="container-wide relative py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-4 py-1.5 font-body text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brass">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" />
              {COMPANY.legalNameUpper}
            </p>
            <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.1] text-paper sm:text-5xl lg:text-[3.5rem]">
              Thông Báo Đấu Giá <span className="text-brass">Bất Động Sản</span> &amp;
              Tài Sản
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-body text-base leading-relaxed text-paper/70 sm:text-lg">
              Nơi công bố chính thức các thông báo đấu giá quyền sử dụng đất, tài
              sản thi hành án và tài sản thanh lý tại {COMPANY.address.region}.
            </p>

            {/* Search — the primary find-a-notice affordance */}
            <form
              action="/search"
              method="get"
              role="search"
              className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-paper/15 bg-paper/[0.06] p-2 backdrop-blur focus-within:border-brass/60"
            >
              <label htmlFor="hero-search" className="sr-only">
                Tìm thông báo đấu giá
              </label>
              <Search className="ml-2 h-5 w-5 shrink-0 text-paper/50" aria-hidden />
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="Tìm theo địa điểm, tài sản, số thông báo…"
                className="min-w-0 flex-1 bg-transparent font-body text-sm text-paper placeholder:text-paper/40 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brass px-5 py-2.5 font-body text-sm font-semibold text-pine-deep transition-colors hover:bg-brass/90"
              >
                Tìm
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-4 font-body text-xs text-paper/50">
              <Link
                href="/articles"
                className="inline-flex items-center gap-1.5 text-paper/70 underline-offset-4 transition-colors hover:text-brass hover:underline"
              >
                Xem tất cả thông báo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {COMPANY.address.region}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featured.length > 0 && (
        <section className="py-14 sm:py-16">
          <div className="container-wide">
            <SectionHead
              eyebrow="Nổi bật"
              title="Thông báo đáng chú ý"
              href="/articles"
            />
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((article, idx) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  priority={idx === 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category strip */}
      {categories.length > 0 && (
        <section className="border-y border-line bg-pine-pale/50 py-12">
          <div className="container-wide">
            <h2 className="eyebrow text-center text-pine">Danh mục tài sản</h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="group inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 font-body text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-sm"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                  <ArrowRight className="h-3.5 w-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-pine" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles */}
      {latest.length > 0 && (
        <section className="py-14 sm:py-16">
          <div className="container-wide">
            <SectionHead
              eyebrow="Mới nhất"
              title="Thông báo mới công bố"
              href="/articles"
            />
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

function SectionHead({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="eyebrow text-brass-ink">{eyebrow}</p>
        <h2 className="mt-1.5 font-heading text-2xl font-bold text-ink sm:text-3xl">
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 font-body text-sm font-medium text-pine transition-colors hover:text-brass"
      >
        Xem tất cả
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
