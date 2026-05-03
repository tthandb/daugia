import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Download, Eye, Calendar, User, FileText, Paperclip, MapPin, Clock, Wallet } from "lucide-react";
import { publicFetch } from "@/lib/api";
import type { Article } from "@/lib/api";
import { formatDate, formatFileSize } from "@/lib/utils";
import { ViewTracker } from "@/components/view-tracker";
import { COMPANY } from "@/lib/company";

// ISR: regenerate at most every 5 min so Vercel edge caches the rendered HTML
// instead of hitting the HCM 2 origin on every request.
export const revalidate = 300;

interface ArticlePageProps {
  params: { slug: string };
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const res = await publicFetch<{ data: Article }>(`/api/articles/${slug}`);
    return res.data;
  } catch {
    return null;
  }
}

async function getRelatedArticles(
  categorySlug: string | null,
  excludeId: string
): Promise<Article[]> {
  if (!categorySlug) return [];
  try {
    const res = await publicFetch<{ data: Article[] }>(
      `/api/articles?category=${categorySlug}&per_page=3`
    );
    return (res.data || []).filter((a) => a.id !== excludeId).slice(0, 3);
  } catch {
    return [];
  }
}

async function getSitemapSlugs(): Promise<{ slug: string }[]> {
  try {
    const res = await publicFetch<{ data: { slug: string }[] }>("/api/sitemap");
    return res.data;
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const slugs = await getSitemapSlugs();
  return slugs.map((item) => ({ slug: item.slug }));
}

function absoluteImageUrl(thumbnailUrl: string | null | undefined): string | null {
  if (!thumbnailUrl) return null;
  if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
  return `${COMPANY.url}${thumbnailUrl.startsWith("/") ? "" : "/"}${thumbnailUrl}`;
}

/**
 * Prefer admin-written metaDescription; fall back to auto-clipped description.
 * The fallback is fine for legacy rows but reads as broken in SERP — admins
 * should fill metaDescription whenever they edit an article.
 */
function descriptionFor(article: Article): string {
  return (article.metaDescription && article.metaDescription.trim()) || article.description;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) {
    return {
      title: "Bài viết không tồn tại",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/articles/${article.slug}`;
  const ogImage = absoluteImageUrl(article.thumbnailUrl) || `${COMPANY.url}/opengraph-image`;
  const description = descriptionFor(article);

  return {
    title: article.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      locale: "vi_VN",
      url: `${COMPANY.url}${canonical}`,
      siteName: COMPANY.legalName,
      publishedTime: article.publishedAt || undefined,
      modifiedTime: article.updatedAt || undefined,
      authors: [article.authorName],
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Returns a short uppercase label (PDF, DOCX, …) derived from filename or MIME.
 */
function fileExtensionLabel(
  fileName?: string | null,
  mime?: string | null
): string {
  if (fileName) {
    const m = fileName.match(/\.([a-z0-9]{2,5})$/i);
    if (m) return m[1].toUpperCase();
  }
  if (mime?.includes("pdf")) return "PDF";
  if (mime?.includes("wordprocessingml")) return "DOCX";
  if (mime?.includes("msword")) return "DOC";
  return "";
}

/**
 * Extract headings from HTML content for table of contents.
 */
function extractHeadings(
  html: string
): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
    headings.push({ id, text, level });
  }
  return headings;
}

/**
 * Inject IDs into heading tags for anchor links.
 */
function injectHeadingIds(html: string): string {
  return html.replace(/<h([2-3])([^>]*)>(.*?)<\/h[2-3]>/gi, (_, level, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  const related = await getRelatedArticles(article.categorySlug, article.id);

  const contentHtml = article.contentHtml
    ? injectHeadingIds(article.contentHtml)
    : "";
  const headings = article.contentHtml
    ? extractHeadings(article.contentHtml)
    : [];

  const images = article.images || [];
  const attachments = article.attachments || [];
  const tags = article.tags || [];

  // JSON-LD structured data — Article + BreadcrumbList graph (+ Event when set)
  const articleUrl = `${COMPANY.url}/articles/${article.slug}`;
  const articleImageAbs = absoluteImageUrl(article.thumbnailUrl);
  const articleDescription = descriptionFor(article);

  const breadcrumbItems: { name: string; item: string }[] = [
    { name: "Trang Chủ", item: COMPANY.url },
    { name: "Thông Báo Đấu Giá", item: `${COMPANY.url}/articles` },
  ];
  if (article.categoryName && article.categorySlug) {
    breadcrumbItems.push({
      name: article.categoryName,
      item: `${COMPANY.url}/categories/${article.categorySlug}`,
    });
  }
  breadcrumbItems.push({ name: article.title, item: articleUrl });

  // Event node — only emitted when an auctionStart timestamp exists. Required
  // Event fields are name + startDate + location + (eventAttendanceMode for
  // offline). We compose location from venueName + venueAddress if either is
  // set; otherwise fall back to a Place describing the company office.
  const auctionEvent =
    article.auctionStart
      ? {
          "@type": "Event",
          "@id": `${articleUrl}#auction`,
          name: article.title,
          description: articleDescription,
          startDate: article.auctionStart,
          ...(article.auctionEnd && { endDate: article.auctionEnd }),
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          inLanguage: "vi-VN",
          location: {
            "@type": "Place",
            name: article.venueName || COMPANY.legalName,
            address: {
              "@type": "PostalAddress",
              ...(article.venueAddress
                ? { streetAddress: article.venueAddress }
                : {
                    streetAddress: COMPANY.address.street,
                    addressLocality: COMPANY.address.locality,
                  }),
              addressRegion: article.province || COMPANY.address.region,
              addressCountry: COMPANY.address.countryCode,
            },
          },
          ...(article.startingPrice && {
            offers: {
              "@type": "Offer",
              price: String(article.startingPrice),
              priceCurrency: "VND",
              availability: "https://schema.org/InStock",
              url: articleUrl,
              ...(article.publishedAt && { validFrom: article.publishedAt }),
              ...(article.depositAmount && {
                category: `Đặt cọc: ${article.depositAmount.toLocaleString("vi-VN")} VND`,
              }),
            },
          }),
          organizer: { "@id": COMPANY.ids.organization },
          ...(articleImageAbs && { image: articleImageAbs }),
          url: articleUrl,
        }
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${articleUrl}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
        headline: article.title,
        description: articleDescription,
        inLanguage: "vi-VN",
        author: { "@type": "Person", name: article.authorName },
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        publisher: { "@id": COMPANY.ids.organization },
        ...(articleImageAbs && { image: articleImageAbs }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.item,
        })),
      },
      ...(auctionEvent ? [auctionEvent] : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTracker articleId={article.id} />

      <div className="container-wide py-10">
        <div className="lg:grid lg:grid-cols-[220px_1fr_260px] lg:gap-8">
          {/* Left sidebar — Table of Contents (desktop) */}
          <aside className="hidden lg:block">
            {headings.length > 0 && (
              <nav className="sticky top-20">
                <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-charcoal">
                  Mục Lục
                </h4>
                <ul className="mt-3 space-y-2 border-l border-warm-border pl-4">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block font-body text-sm text-muted-fg transition-colors hover:text-gold ${
                          h.level === 3 ? "pl-3" : ""
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </aside>

          {/* Main content column */}
          <div className="min-w-0 max-w-3xl">
            {/* Article header */}
            <header className="mb-8">
              {/* Category badge */}
              {article.categoryName && article.categorySlug && (
                <Link
                  href={`/categories/${article.categorySlug}`}
                  className="inline-block rounded-full px-3 py-1 font-body text-xs font-semibold text-white transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: article.categoryColor || "#A16207",
                  }}
                >
                  {article.categoryName}
                </Link>
              )}

              <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-charcoal sm:text-4xl">
                {article.title}
              </h1>

              {article.description && (
                <p className="mt-4 border-l-4 border-gold/30 pl-4 font-body text-base text-charcoal-light leading-relaxed italic">
                  {article.description}
                </p>
              )}

              {/* Meta bar */}
              <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-warm-border py-4 font-body text-sm text-muted-fg">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {article.authorName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(article.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {article.viewCount.toLocaleString("vi-VN")} lượt xem
                </span>
              </div>

              {/* Location metadata */}
              {(article.province || article.district) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {article.province && (
                    <span className="inline-flex items-center rounded bg-stone-100 px-2.5 py-1 font-body text-xs text-charcoal">
                      {article.province}
                    </span>
                  )}
                  {article.district && (
                    <span className="inline-flex items-center rounded bg-stone-100 px-2.5 py-1 font-body text-xs text-charcoal">
                      {article.district}
                    </span>
                  )}
                  {article.ward && (
                    <span className="inline-flex items-center rounded bg-stone-100 px-2.5 py-1 font-body text-xs text-charcoal">
                      {article.ward}
                    </span>
                  )}
                </div>
              )}

              {/* Auction details — visible block matching the Event JSON-LD.
                  Google requires that structured data describes content the
                  user can actually see on the page. */}
              {article.auctionStart && (
                <aside className="mt-6 rounded-lg border border-gold/40 bg-gold-pale/40 p-5">
                  <h2 className="font-heading text-lg font-bold text-charcoal">
                    Thông Tin Cuộc Đấu Giá
                  </h2>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      <div>
                        <dt className="font-body text-xs uppercase tracking-wider text-muted-fg">
                          Thời gian
                        </dt>
                        <dd className="font-body text-sm font-medium text-charcoal">
                          {formatDate(article.auctionStart)}
                          {article.auctionEnd && (
                            <> – {formatDate(article.auctionEnd)}</>
                          )}
                        </dd>
                      </div>
                    </div>
                    {(article.venueName || article.venueAddress) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <div>
                          <dt className="font-body text-xs uppercase tracking-wider text-muted-fg">
                            Địa điểm
                          </dt>
                          <dd className="font-body text-sm font-medium text-charcoal">
                            {article.venueName}
                            {article.venueName && article.venueAddress && (
                              <>, </>
                            )}
                            {article.venueAddress}
                          </dd>
                        </div>
                      </div>
                    )}
                    {article.startingPrice != null && (
                      <div className="flex items-start gap-2">
                        <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <div>
                          <dt className="font-body text-xs uppercase tracking-wider text-muted-fg">
                            Giá khởi điểm
                          </dt>
                          <dd className="font-body text-sm font-medium text-charcoal">
                            {article.startingPrice.toLocaleString("vi-VN")} VND
                          </dd>
                        </div>
                      </div>
                    )}
                    {article.depositAmount != null && (
                      <div className="flex items-start gap-2">
                        <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <div>
                          <dt className="font-body text-xs uppercase tracking-wider text-muted-fg">
                            Tiền đặt trước
                          </dt>
                          <dd className="font-body text-sm font-medium text-charcoal">
                            {article.depositAmount.toLocaleString("vi-VN")} VND
                          </dd>
                        </div>
                      </div>
                    )}
                  </dl>
                </aside>
              )}
            </header>

            {/* Article content */}
            {contentHtml && (
              <article
                className="prose prose-lg prose-stone max-w-none font-document prose-document-table"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}

            {/* Image gallery */}
            {images.length > 0 && (
              <section className="mt-12">
                <h2 className="font-heading text-2xl font-bold text-charcoal">
                  Hình Ảnh
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="overflow-hidden rounded-lg border border-warm-border"
                    >
                      <Image
                        src={img.url}
                        alt={img.altText || img.fileName}
                        width={img.width || 800}
                        height={img.height || 600}
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="h-auto w-full object-cover"
                      />
                      {img.altText && (
                        <p className="px-3 py-2 font-body text-xs text-muted-fg">
                          {img.altText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <section className="mt-12">
                <h2 className="font-heading text-2xl font-bold text-charcoal">
                  <Paperclip className="mr-2 inline-block h-5 w-5" />
                  Tài Liệu Đính Kèm
                </h2>
                <div className="mt-4 space-y-3">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-lg border border-warm-border p-4 transition-colors hover:border-gold hover:bg-gold-pale/30"
                    >
                      <FileText className="h-8 w-8 shrink-0 text-muted-fg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-charcoal">
                          {att.fileName}
                        </p>
                        <p className="font-body text-xs text-muted-fg">
                          {att.fileMime} &middot;{" "}
                          {formatFileSize(att.sizeBytes)}
                        </p>
                      </div>
                      <Download className="h-4 w-4 shrink-0 text-gold" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tags/${tag.slug}`}
                    className="inline-flex items-center rounded-full border border-warm-border px-3 py-1 font-body text-xs text-muted-fg transition-colors hover:border-gold hover:text-gold"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Original document download */}
            {article.originalFileName && (
              <section className="mt-12 rounded-lg border border-warm-border bg-warm-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gold-pale">
                      <FileText className="h-5 w-5 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold text-charcoal">
                        Tài Liệu Gốc
                      </p>
                      <p
                        className="truncate font-body text-xs text-muted-fg"
                        title={article.originalFileName}
                      >
                        {article.originalFileName}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/articles/${article.slug}/download`}
                    className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-md bg-charcoal px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-gold"
                  >
                    <Download className="h-4 w-4" />
                    Tải Xuống
                    {fileExtensionLabel(
                      article.originalFileName,
                      article.originalFileMime
                    ) && (
                      <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {fileExtensionLabel(
                          article.originalFileName,
                          article.originalFileMime
                        )}
                      </span>
                    )}
                  </a>
                </div>
              </section>
            )}
          </div>

          {/* Right sidebar — Related articles (desktop) */}
          <aside className="hidden lg:block">
            {related.length > 0 && (
              <div className="sticky top-20">
                <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-charcoal">
                  Bài Viết Liên Quan
                </h4>
                <div className="mt-4 space-y-4">
                  {related.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/articles/${rel.slug}`}
                      className="group block"
                    >
                      <h5 className="font-heading text-sm font-semibold leading-snug text-charcoal transition-colors group-hover:text-gold line-clamp-3">
                        {rel.title}
                      </h5>
                      <p className="mt-1 font-body text-xs text-muted-fg">
                        {formatDate(rel.publishedAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
