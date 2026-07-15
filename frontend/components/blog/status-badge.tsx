import { cn } from "@/lib/utils";
import type { BlogPostStatus } from "@/types/blog";

const STYLES: Record<BlogPostStatus, string> = {
  published: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  draft: "border-border bg-muted text-muted-foreground",
  archived: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const LABELS: Record<BlogPostStatus, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: BlogPostStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
