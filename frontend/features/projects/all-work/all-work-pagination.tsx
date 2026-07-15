"use client";

import { Button } from "@/components/ui/button";

interface PaginationFooterProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PaginationFooter({ page, limit, total, onPageChange }: PaginationFooterProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  function handlePrev() {
    if (page > 1) onPageChange(page - 1);
  }

  function handleNext() {
    if (page < totalPages) onPageChange(page + 1);
  }

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/60 bg-card/40 px-4 py-2 text-xs text-muted-foreground backdrop-blur-md supports-[backdrop-filter]:bg-card/30">
      <span className="tabular-nums">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="px-2.5 text-xs"
          disabled={page <= 1}
          onClick={handlePrev}
          aria-label="Previous page"
        >
          Prev
        </Button>
        <span className="min-w-[3rem] text-center tabular-nums">
          {page} / {totalPages || 1}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="px-2.5 text-xs"
          disabled={page >= totalPages}
          onClick={handleNext}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
