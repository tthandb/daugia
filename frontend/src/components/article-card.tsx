import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

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
  };
  className?: string;
  /**
   * Mark this card's image as the LCP candidate. Pass `true` for the first
   * card in any above-the-fold grid so Next emits `fetchpriority="high"` and
   * skips lazy-loading. Default `false` keeps every other card lazy.
   */
  priority?: boolean;
}

export function ArticleCard({ article, className, priority = false }: ArticleCardProps) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-warm-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-charcoal">
        {article.thumbnailUrl ? (
          <Image
            src={article.thumbnailUrl}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-heading text-2xl font-bold text-warm-white/20">
              ĐẤUGIÁ.
            </span>
          </div>
        )}

        {/* Category badge */}
        {article.categoryName && (
          <span
            className="absolute left-3 top-3 rounded-full px-3 py-1 font-body text-xs font-semibold text-white"
            style={{
              backgroundColor: article.categoryColor || "#A16207",
            }}
          >
            {article.categoryName}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="line-clamp-2 font-heading text-xl font-semibold text-charcoal transition-colors group-hover:text-gold">
          {article.title}
        </h3>

        {/* Description */}
        {article.description && (
          <p className="mt-2 line-clamp-2 font-body text-sm text-muted-fg">
            {article.description}
          </p>
        )}

        {/* Meta */}
        <div className="mt-auto flex items-center gap-2 pt-4 font-body text-xs text-muted-fg">
          <span>{article.authorName}</span>
          <span>&middot;</span>
          <span>{formatDate(article.publishedAt)}</span>
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {article.viewCount.toLocaleString("vi-VN")}
          </span>
        </div>
      </div>
    </Link>
  );
}
