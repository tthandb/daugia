import Link from "next/link";
import Image from "next/image";
import { Eye, MapPin, CalendarClock, Gavel, Landmark } from "lucide-react";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  auctionStatus,
  formatVnd,
  formatLocation,
} from "@/lib/auction";
import { StatusBadge, readableTextOn } from "@/components/status-badge";

export interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    authorName: string;
    publishedAt: string | null;
    thumbnailUrl: string | null;
    viewCount: number;
    categoryName: string | null;
    categorySlug: string | null;
    categoryColor: string | null;
    province?: string | null;
    district?: string | null;
    ward?: string | null;
    auctionStart?: string | null;
    auctionEnd?: string | null;
    startingPrice?: number | null;
  };
  className?: string;
  /**
   * Mark this card's image as the LCP candidate. Pass `true` for the first
   * card in any above-the-fold grid so Next emits `fetchpriority="high"`.
   */
  priority?: boolean;
}

export function ArticleCard({ article, className, priority = false }: ArticleCardProps) {
  const status = auctionStatus(article);
  const location = formatLocation(article);
  const price = formatVnd(article.startingPrice);
  const hasFacts = Boolean(location || article.auctionStart || price);

  return (
    <Link
      href={`/articles/${article.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-pine/30 hover:shadow-[0_12px_30px_-12px_rgba(18,47,35,0.25)]",
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-pine-pale">
        {article.thumbnailUrl ? (
          <Image
            src={article.thumbnailUrl}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          // Refined placeholder for notices without a cover — reads as an
          // official document, not a broken image.
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,#EFF4EE,#E2ECE3)]">
            <Landmark className="h-8 w-8 text-pine/35" strokeWidth={1.5} />
            <span className="eyebrow text-pine/50">Thông báo đấu giá</span>
          </div>
        )}

        {article.categoryName && (
          <span
            className="absolute left-3 top-3 rounded-md px-2.5 py-1 font-body text-[0.6875rem] font-semibold shadow-sm"
            style={{
              backgroundColor: article.categoryColor || "#1B4332",
              color: readableTextOn(article.categoryColor),
            }}
          >
            {article.categoryName}
          </span>
        )}
        {status.key !== "none" && (
          <StatusBadge
            status={status}
            className="absolute right-3 top-3 bg-card/95 shadow-sm backdrop-blur"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-heading text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-pine">
          {article.title}
        </h3>

        {/* Fact strip — the "docket" */}
        {hasFacts ? (
          <dl className="mt-3 space-y-1.5">
            {location && (
              <Fact icon={<MapPin className="h-3.5 w-3.5" />}>
                <span className="line-clamp-1">{location}</span>
              </Fact>
            )}
            {article.auctionStart && (
              <Fact icon={<CalendarClock className="h-3.5 w-3.5" />}>
                <span className="data text-ink">
                  {formatDateTime(article.auctionStart)}
                </span>
              </Fact>
            )}
            {price && (
              <Fact icon={<Gavel className="h-3.5 w-3.5" />}>
                <span className="data font-semibold text-pine">{price}</span>
                <span className="ml-1 text-ink-faint">giá khởi điểm</span>
              </Fact>
            )}
          </dl>
        ) : (
          article.description && (
            <p className="mt-2 line-clamp-2 font-body text-sm text-ink-soft">
              {article.description}
            </p>
          )
        )}

        {/* Footer meta */}
        <div className="mt-auto flex items-center gap-2 pt-4 font-body text-xs text-ink-faint">
          <span>{formatDate(article.publishedAt)}</span>
          <span aria-hidden>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {article.viewCount.toLocaleString("vi-VN")}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Fact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <dd className="flex items-center gap-2 font-body text-[0.8125rem] text-ink-soft">
      <span className="shrink-0 text-pine/60">{icon}</span>
      {children}
    </dd>
  );
}
