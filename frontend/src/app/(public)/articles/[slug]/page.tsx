import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Download,
  Eye,
  Calendar,
  User,
  FileText,
  Paperclip,
  MapPin,
  Clock,
  Wallet,
  Gavel,
  ChevronRight,
  ListTree,
} from "lucide-react";
import { publicFetch, ApiError } from "@/lib/api";
import type { Article } from "@/lib/api";
import { formatDate, formatDateTime, formatFileSize } from "@/lib/utils";
import { auctionStatus, formatVnd } from "@/lib/auction";
import { StatusBadge, readableTextOn } from "@/components/status-badge";
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
  } catch (err) {
    // Only treat a genuine 404 as "not found". For any other error (upstream
    // 5xx, network) rethrow so a failed ISR render preserves the last good
    // cached page instead of caching a 404 across the whole catalog.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
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

// Vietnamese-safe heading slug: transliterate diacritics (đ→d, strip combining
// marks) instead of dropping them — "Đấu Giá Quyền" → "dau-gia-quyen", not a
// garbled "u-gi-quyn". Falls back to "muc" if a heading is all punctuation.
function slugifyHeading(text: string): string {
  const base =
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "muc";
  return base;
}

/**
 * Single pass over the content: inject stable, unique, Vietnamese-safe ids into
 * h2/h3 tags AND return the matching table-of-contents list. Doing both here
 * (with one de-dupe counter) guarantees the anchors and TOC links stay in sync.
 */
function processContent(html: string): {
  html: string;
  headings: { id: string; text: string; level: number }[];
} {
  const headings: { id: string; text: string; level: number }[] = [];
  const seen = new Map<string, number>();
  const out = html.replace(
    /<h([2-3])([^>]*)>(.*?)<\/h[2-3]>/gi,
    (_, level, attrs, content) => {
      const text = content.replace(/<[^>]*>/g, "").trim();
      let id = slugifyHeading(text);
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      if (n > 0) id = `${id}-${n + 1}`;
      headings.push({ id, text, level: parseInt(level, 10) });
      return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
    },
  );
  return { html: out, headings };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  const related = await getRelatedArticles(article.categorySlug, article.id);

  const { html: contentHtml, headings } = article.contentHtml
    ? processContent(article.contentHtml)
    : { html: "", headings: [] };

  const images = article.images || [];
  const attachments = article.attachments || [];
  const tags = article.tags || [];

  // Auction docket derived values
  const status = auctionStatus(article);
  const startingPrice = formatVnd(article.startingPrice);
  const depositAmount = formatVnd(article.depositAmount);
  const venueText = [article.venueName, article.venueAddress]
    .filter(Boolean)
    .join(", ");
  const hasAuctionInfo = Boolean(
    article.auctionStart ||
      venueText ||
      startingPrice ||
      depositAmount ||
      article.province ||
      article.district ||
      article.ward,
  );
  const locationChips = [
    article.ward,
    article.district,
    article.province,
  ]
    .filter((v): v is string => Boolean(v))
    .map((label) => ({
      label,
      href: `/articles?province=${encodeURIComponent(article.province || label)}`,
    }));

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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ViewTracker articleId={article.id} />

      {/* Breadcrumb */}
      <div className="border-b border-line bg-card">
        <nav
          aria-label="Breadcrumb"
          className="container-wide flex items-center gap-1.5 overflow-x-auto py-3 font-body text-xs text-ink-faint no-scrollbar"
        >
          <Link href="/" className="shrink-0 hover:text-pine">Trang chủ</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link href="/articles" className="shrink-0 hover:text-pine">Thông báo</Link>
          {article.categoryName && article.categorySlug && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <Link
                href={`/categories/${article.categorySlug}`}
                className="shrink-0 hover:text-pine"
              >
                {article.categoryName}
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="container-wide py-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)_260px] lg:gap-10">
          {/* Left sidebar — Table of Contents (desktop) */}
          <aside className="hidden lg:block">
            {headings.length > 0 && (
              <nav className="sticky top-20">
                <h2 className="eyebrow flex items-center gap-1.5 text-pine">
                  <ListTree className="h-3.5 w-3.5" />
                  Mục lục
                </h2>
                <ul className="mt-3 space-y-1.5 border-l border-line pl-4">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block font-body text-[0.8125rem] leading-snug text-ink-soft transition-colors hover:text-pine ${
                          h.level === 3 ? "pl-3 text-ink-faint" : ""
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
          <div className="min-w-0">
            {/* Article header */}
            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-2">
                {article.categoryName && article.categorySlug && (
                  <Link
                    href={`/categories/${article.categorySlug}`}
                    className="inline-block rounded-md px-2.5 py-1 font-body text-[0.6875rem] font-semibold transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: article.categoryColor || "#1B4332",
                      color: readableTextOn(article.categoryColor),
                    }}
                  >
                    {article.categoryName}
                  </Link>
                )}
                <StatusBadge status={status} />
              </div>

              <h1 className="mt-4 font-heading text-3xl font-bold leading-[1.15] text-ink sm:text-[2.5rem]">
                {article.title}
              </h1>

              {/* Meta bar */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 font-body text-sm text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4 text-ink-faint" />
                  {article.authorName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-ink-faint" />
                  {formatDate(article.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-ink-faint" />
                  {article.viewCount.toLocaleString("vi-VN")} lượt xem
                </span>
              </div>
            </header>

            {/* ── Auction docket — the key facts, above the fold ── */}
            {hasAuctionInfo && (
              <section
                aria-label="Thông tin cuộc đấu giá"
                className="mb-8 overflow-hidden rounded-xl border border-line bg-card shadow-[0_1px_3px_rgba(18,47,35,0.05)]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-line bg-pine-pale/50 px-5 py-3">
                  <h2 className="flex items-center gap-2 font-heading text-base font-bold text-pine">
                    <Gavel className="h-4 w-4" />
                    Thông tin cuộc đấu giá
                  </h2>
                  <StatusBadge status={status} />
                </div>
                <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                  {article.auctionStart && (
                    <DocketRow icon={<Clock className="h-4 w-4" />} label="Thời gian đấu giá">
                      <span className="data text-ink">
                        {formatDateTime(article.auctionStart)}
                        {article.auctionEnd && (
                          <> – {formatDateTime(article.auctionEnd)}</>
                        )}
                      </span>
                    </DocketRow>
                  )}
                  {venueText && (
                    <DocketRow icon={<MapPin className="h-4 w-4" />} label="Địa điểm đấu giá">
                      <span className="text-ink">{venueText}</span>
                    </DocketRow>
                  )}
                  {startingPrice && (
                    <DocketRow icon={<Gavel className="h-4 w-4" />} label="Giá khởi điểm">
                      <span className="data text-base font-semibold text-pine">
                        {startingPrice}
                      </span>
                    </DocketRow>
                  )}
                  {depositAmount && (
                    <DocketRow icon={<Wallet className="h-4 w-4" />} label="Tiền đặt trước">
                      <span className="data font-medium text-ink">{depositAmount}</span>
                    </DocketRow>
                  )}
                  {locationChips.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="eyebrow mb-1.5 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-pine/60" />
                        Vị trí tài sản
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {locationChips.map((chip) => (
                          <Link
                            key={chip.label}
                            href={chip.href}
                            className="inline-flex items-center rounded-md bg-pine-pale px-2.5 py-1 font-body text-xs font-medium text-pine transition-colors hover:bg-pine hover:text-paper"
                          >
                            {chip.label}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Mobile Table of Contents */}
            {headings.length > 0 && (
              <details className="group mb-6 rounded-lg border border-line bg-card lg:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-body text-sm font-semibold text-ink">
                  <ListTree className="h-4 w-4 text-pine" />
                  Mục lục
                  <ChevronRight className="ml-auto h-4 w-4 text-ink-faint transition-transform group-open:rotate-90" />
                </summary>
                <ul className="space-y-1 border-t border-line px-4 py-3">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block py-1 font-body text-sm text-ink-soft ${
                          h.level === 3 ? "pl-3 text-ink-faint" : ""
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Description lead */}
            {article.description && (
              <p className="mb-8 border-l-2 border-brass pl-4 font-heading text-lg leading-relaxed text-ink-soft">
                {article.description}
              </p>
            )}

            {/* Article content */}
            {contentHtml && (
              <article
                className="prose prose-lg max-w-none font-document prose-document-table prose-headings:font-heading"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}

            {/* Image gallery */}
            {images.length > 0 && (
              <section className="mt-12">
                <h2 className="font-heading text-xl font-bold text-ink">Hình ảnh</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {images.map((img) => (
                    <figure
                      key={img.id}
                      className="overflow-hidden rounded-lg border border-line"
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
                        <figcaption className="px-3 py-2 font-body text-xs text-ink-faint">
                          {img.altText}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <section className="mt-12">
                <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-ink">
                  <Paperclip className="h-5 w-5 text-pine" />
                  Tài liệu đính kèm
                </h2>
                <div className="mt-4 space-y-3">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-lg border border-line bg-card p-4 transition-colors hover:border-pine/40 hover:bg-pine-pale/40"
                    >
                      <FileText className="h-8 w-8 shrink-0 text-pine/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-ink">
                          {att.fileName}
                        </p>
                        <p className="font-body text-xs text-ink-faint">
                          {att.fileMime} &middot; {formatFileSize(att.sizeBytes)}
                        </p>
                      </div>
                      <Download className="h-4 w-4 shrink-0 text-pine" />
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
                    className="inline-flex items-center rounded-md border border-line px-2.5 py-1 font-body text-xs text-ink-soft transition-colors hover:border-pine/40 hover:text-pine"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Original document download — prominent */}
            {article.originalFileName && (
              <section className="mt-12 overflow-hidden rounded-xl border border-line bg-gradient-to-br from-pine-pale/60 to-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pine text-paper">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="eyebrow text-brass-ink">Tài liệu gốc</p>
                      <p
                        className="truncate font-body text-sm font-medium text-ink"
                        title={article.originalFileName}
                      >
                        {article.originalFileName}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/articles/${article.slug}/download`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-pine px-6 py-3 font-body text-sm font-semibold text-paper transition-colors hover:bg-brass"
                  >
                    <Download className="h-4 w-4" />
                    Tải xuống
                    {fileExtensionLabel(
                      article.originalFileName,
                      article.originalFileMime,
                    ) && (
                      <span className="rounded bg-paper/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {fileExtensionLabel(
                          article.originalFileName,
                          article.originalFileMime,
                        )}
                      </span>
                    )}
                  </a>
                </div>
              </section>
            )}

            {/* Related — mobile (below content) */}
            {related.length > 0 && (
              <section className="mt-12 border-t border-line pt-8 lg:hidden">
                <h2 className="eyebrow text-pine">Bài viết liên quan</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {related.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/articles/${rel.slug}`}
                      className="group rounded-lg border border-line bg-card p-4 transition-colors hover:border-pine/30"
                    >
                      <h3 className="line-clamp-3 font-heading text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-pine">
                        {rel.title}
                      </h3>
                      <p className="mt-2 font-body text-xs text-ink-faint">
                        {formatDate(rel.publishedAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right sidebar — Related articles (desktop) */}
          <aside className="hidden lg:block">
            {related.length > 0 && (
              <div className="sticky top-20">
                <h2 className="eyebrow text-pine">Bài viết liên quan</h2>
                <div className="mt-4 space-y-4">
                  {related.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/articles/${rel.slug}`}
                      className="group block border-l-2 border-line pl-3 transition-colors hover:border-brass"
                    >
                      <h3 className="line-clamp-3 font-heading text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-pine">
                        {rel.title}
                      </h3>
                      <p className="mt-1 font-body text-xs text-ink-faint">
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

function DocketRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="eyebrow mb-1 flex items-center gap-1.5">
        <span className="text-pine/60">{icon}</span>
        {label}
      </dt>
      <dd className="font-body text-sm">{children}</dd>
    </div>
  );
}
