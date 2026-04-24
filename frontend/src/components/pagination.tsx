import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string>;
}

function buildHref(
  basePath: string,
  page: number,
  params?: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);
  if (page > 1) {
    searchParams.set("page", String(page));
  }
  const qs = searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  params,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Phân trang"
    >
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={buildHref(basePath, currentPage - 1, params)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-warm-border text-charcoal transition-colors hover:bg-charcoal hover:text-white"
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-warm-border text-muted-fg/40">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex h-10 w-10 items-center justify-center font-body text-sm text-muted-fg"
          >
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(basePath, page, params)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-lg font-body text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-charcoal text-white"
                : "border border-warm-border text-charcoal hover:bg-charcoal hover:text-white",
            )}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Link>
        ),
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={buildHref(basePath, currentPage + 1, params)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-warm-border text-charcoal transition-colors hover:bg-charcoal hover:text-white"
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-warm-border text-muted-fg/40">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
