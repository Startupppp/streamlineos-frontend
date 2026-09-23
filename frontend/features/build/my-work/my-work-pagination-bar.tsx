"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MyWorkPaginationBarProps {
  pageNumber: number;
  hasPrevious: boolean;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const MyWorkPaginationBar = memo(function MyWorkPaginationBar({
  pageNumber,
  hasPrevious,
  hasMore,
  onPrevious,
  onNext,
}: MyWorkPaginationBarProps) {
  if (!hasPrevious && !hasMore) return null;

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/50 px-3 py-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs"
        disabled={!hasPrevious}
        onClick={onPrevious}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Previous
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        Page {pageNumber}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs"
        disabled={!hasMore}
        onClick={onNext}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});
