import Link from "next/link";
import { cn } from "@/lib/utils";
import { readableTextOn } from "@/components/status-badge";

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeSlug: string | null;
}

export function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <Link
        href="/articles"
        className={cn(
          "inline-flex shrink-0 items-center rounded-lg px-4 py-2 font-body text-sm font-medium transition-colors",
          activeSlug === null
            ? "bg-pine text-paper"
            : "border border-line bg-card text-ink-soft hover:border-pine/40 hover:text-pine",
        )}
      >
        Tất cả
      </Link>

      {categories.map((category) => {
        const isActive = activeSlug === category.slug;
        return (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 font-body text-sm font-medium transition-colors",
              isActive
                ? ""
                : "border border-line bg-card text-ink-soft hover:border-pine/40 hover:text-pine",
            )}
            style={
              isActive
                ? {
                    backgroundColor: category.color,
                    color: readableTextOn(category.color),
                  }
                : undefined
            }
          >
            {!isActive && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            )}
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
