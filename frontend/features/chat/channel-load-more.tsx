"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelLoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  isTruncated?: boolean;
  label?: string;
  truncatedHint?: string;
  className?: string;
}

export function ChannelLoadMore({
  hasMore,
  isLoading,
  onLoadMore,
  isTruncated = false,
  label = "Load more conversations",
  truncatedHint = "Search by name to reach the rest.",
  className,
}: ChannelLoadMoreProps) {
  if (isTruncated)
    return (
      <p
        role="status"
        className={cn("px-2 py-1.5 text-dense text-muted-foreground", className)}
      >
        {`Showing the channels loaded so far. ${truncatedHint}`}
      </p>
    );

  if (!hasMore) return null;

  return (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={isLoading}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-dense font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-60",
        className,
      )}
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {isLoading ? "Loading more…" : label}
    </button>
  );
}
