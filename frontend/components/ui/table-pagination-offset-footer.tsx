"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PageSizeSelect,
  SHELL_CLASS,
  getVisiblePageItems,
  type TablePaginationOffsetProps,
} from "./table-pagination-shared";

export function OffsetFooter({
  page,
  pageSize,
  total,
  onPageChange,
  showPageNumbers = true,
  showEdgeJumps = false,
  onPageSizeChange,
  pageSizeOptions,
  disabled = false,
  className,
}: TablePaginationOffsetProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pageItems = getVisiblePageItems(totalPages, currentPage);

  if (total === 0) return null;

  return (
    <nav aria-label="Pagination" className={cn(SHELL_CLASS, className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="min-w-0 truncate text-left text-xs text-muted-foreground tabular-nums">
          Showing {from}–{to} of {total}
        </span>
        <PageSizeSelect
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
          disabled={disabled}
        />
      </div>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-0.5">
        {showEdgeJumps ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-1.5"
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(1)}
            aria-label="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-1.5"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
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
                  className="h-7 min-w-7 px-1.5 tabular-nums"
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
          <span className="min-w-[3.5rem] text-center text-xs text-muted-foreground tabular-nums">
            {currentPage} / {totalPages}
          </span>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-1.5"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {showEdgeJumps ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-1.5"
            disabled={disabled || currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
