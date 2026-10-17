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
  showPageNumbers = false,
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
  const pageItems = showPageNumbers
    ? getVisiblePageItems(totalPages, currentPage)
    : [];

  const handleFirstPage = () => onPageChange(1);
  const handlePreviousPage = () => onPageChange(currentPage - 1);
  const handleNextPage = () => onPageChange(currentPage + 1);
  const handleLastPage = () => onPageChange(totalPages);

  if (total === 0) return null;

  return (
    <nav aria-label="Pagination" className={cn(SHELL_CLASS, className)}>
      <div className="min-w-0 flex items-center gap-1.5">
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

      <div className="col-start-2 flex shrink-0 flex-nowrap items-center justify-center gap-1">
        {showEdgeJumps ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || currentPage <= 1}
            onClick={handleFirstPage}
            aria-label="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={disabled || currentPage <= 1}
          onClick={handlePreviousPage}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
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
                  size="icon"
                  className="size-8 tabular-nums"
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
          <span
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border/70 bg-muted/50 px-2 text-xs font-medium tabular-nums text-foreground"
            aria-label={`Current page ${currentPage}`}
            aria-current="page"
          >
            {currentPage}
          </span>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={disabled || currentPage >= totalPages}
          onClick={handleNextPage}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>

        {showEdgeJumps ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || currentPage >= totalPages}
            onClick={handleLastPage}
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
