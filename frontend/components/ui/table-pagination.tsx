"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  /** 1-based current page. */
  page: number;
  /** Items per page. */
  pageSize: number;
  /** Total item count across all pages. */
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  /** Render numbered page buttons (default) or a compact `page / total` label. */
  showPageNumbers?: boolean;
  className?: string;
}

/** Page indices to render; `"gap"` renders an ellipsis. Caps at first 2 + last 2
 * with a single middle gap; ≤4 pages render in full. */
export function getVisiblePageItems(totalPages: number): (number | "gap")[] {
  const total = Math.max(1, totalPages);
  if (total <= 4) return Array.from({ length: total }, (_, i) => i + 1);
  return [1, 2, "gap", total - 1, total];
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  showPageNumbers = true,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pageItems = getVisiblePageItems(totalPages);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t border-border/60 bg-card px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3",
        className,
      )}
    >
      <p className="text-center text-xs text-muted-foreground tabular-nums sm:flex-1 sm:text-left">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {showPageNumbers ? (
          <div className="flex max-w-[min(100%,20rem)] flex-wrap items-center justify-center gap-0.5 sm:max-w-none">
            {pageItems.map((item, idx) =>
              item === "gap" ? (
                <span
                  key={`gap-${idx}`}
                  className="px-1 text-xs text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === currentPage ? "default" : "outline"}
                  size="sm"
                  className="h-8 min-w-8 px-2 tabular-nums"
                  disabled={disabled}
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === currentPage ? "page" : undefined}
                >
                  {item}
                </Button>
              ),
            )}
          </div>
        ) : (
          <span className="min-w-[4rem] text-center text-xs text-muted-foreground tabular-nums">
            {currentPage} / {totalPages}
          </span>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
