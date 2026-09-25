"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_ROOT_MARGIN = "0px 0px 300px 0px";

interface InfiniteScrollSentinelProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  label: string;
  pending?: ReactNode;
  exhausted?: ReactNode;
  rootMargin?: string;
  className?: string;
}

export function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  label,
  pending,
  exhausted,
  rootMargin = DEFAULT_ROOT_MARGIN,
  className,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canLoad = hasNextPage && !isFetchingNextPage;

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !canLoad) return;
    if (typeof IntersectionObserver === "undefined") return;

    function handleIntersection(entries: IntersectionObserverEntry[]) {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      onLoadMore();
    }

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canLoad, rootMargin, onLoadMore]);

  function handleLoadMore() {
    if (!canLoad) return;
    onLoadMore();
  }

  if (!hasNextPage)
    return exhausted ? (
      <div
        className={cn(
          "w-full py-3 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        {exhausted}
      </div>
    ) : null;

  return (
    <div
      ref={sentinelRef}
      className={cn("flex w-full justify-center py-3", className)}
    >
      {isFetchingNextPage ? (
        <div
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {pending ?? "Loading more…"}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleLoadMore}
          className="sr-only focus:not-sr-only focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-1.5 focus:text-sm focus:text-foreground"
        >
          {label}
        </button>
      )}
    </div>
  );
}
