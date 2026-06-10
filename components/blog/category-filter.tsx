import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategoryWithCount } from "@/types/blog";

interface CategoryFilterProps {
  categories: CategoryWithCount[];

  activeSlug?: string | null;
}

export function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  return (
    <nav
      aria-label="Filter by category"
      className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible"
    >
      <Pill href="/blogs" active={!activeSlug}>
        All
      </Pill>
      {categories.map((c) => (
        <Pill key={c.id} href={`/blogs/category/${c.slug}`} active={activeSlug === c.slug}>
          {c.name}
          <span className="ml-1.5 text-xs opacity-60">{c.count}</span>
        </Pill>
      ))}
    </nav>
  );
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
