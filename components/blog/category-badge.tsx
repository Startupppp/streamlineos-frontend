import Link from "next/link";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  name: string;
  slug?: string | null;
  color?: string | null;
  className?: string;
  asLink?: boolean;
}

/** Colored category pill. Links to the category page when a slug is provided. */
export function CategoryBadge({
  name,
  slug,
  color,
  className,
  asLink = true,
}: CategoryBadgeProps) {
  const style = color
    ? { color, backgroundColor: `${color}1A`, borderColor: `${color}33` }
    : undefined;

  const content = (
    <span
      aria-label={`Category: ${name}`}
      style={style}
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        !color && "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {name}
    </span>
  );

  if (asLink && slug) {
    return (
      <Link href={`/blogs/category/${slug}`} className="transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }
  return content;
}
