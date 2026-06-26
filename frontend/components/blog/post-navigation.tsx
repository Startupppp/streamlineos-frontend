import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface AdjacentPost {
  slug: string;
  title: string;
}

interface PostNavigationProps {
  prev: AdjacentPost | null;
  next: AdjacentPost | null;
}

export function PostNavigation({ prev, next }: PostNavigationProps) {
  if (!prev && !next) return null;

  return (
    <nav aria-label="Post navigation" className="grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/blogs/${prev.slug}`}
          className="group flex flex-col gap-1 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3" /> Previous
          </span>
          <span className="line-clamp-2 font-medium group-hover:text-primary">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link
          href={`/blogs/${next.slug}`}
          className="group flex flex-col gap-1 rounded-xl border border-border p-4 text-right transition-colors hover:border-primary/40 hover:bg-muted/40 sm:items-end"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Next <ArrowRight className="size-3" />
          </span>
          <span className="line-clamp-2 font-medium group-hover:text-primary">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
