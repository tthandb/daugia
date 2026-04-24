import Link from "next/link";
import { cn } from "@/lib/utils";

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
      {/* "Tất Cả" pill */}
      <Link
        href="/articles"
        className={cn(
          "inline-flex shrink-0 items-center rounded-full px-4 py-2 font-body text-sm font-medium transition-colors",
          activeSlug === null
            ? "bg-gold text-white"
            : "border border-warm-border text-charcoal hover:border-gold hover:text-gold",
        )}
      >
        Tất Cả
      </Link>

      {/* Category pills */}
      {categories.map((category) => {
        const isActive = activeSlug === category.slug;

        return (
          <Link
            key={category.id}
            href={`/articles?category=${category.slug}`}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 font-body text-sm font-medium transition-colors",
              isActive
                ? "text-white"
                : "border border-warm-border text-charcoal hover:border-gold hover:text-gold",
            )}
            style={isActive ? { backgroundColor: category.color } : undefined}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
