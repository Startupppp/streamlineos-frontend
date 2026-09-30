"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OffsetFooter } from "./table-pagination-offset-footer";
import {
  PageSizeSelect,
  SHELL_CLASS,
  type TablePaginationCursorProps,
  type TablePaginationProps,
} from "./table-pagination-shared";

export { useCursorPager } from "./table-pagination-shared";
export type {
  CursorPager,
  TablePaginationCursorProps,
  TablePaginationOffsetProps,
  TablePaginationProps,
} from "./table-pagination-shared";

function CursorFooter({
  rowCount,
  pageNumber,
  cursorVariant = "paged",
  hasMore,
  hasPrevious = false,
  onNext,
  onPrevious = () => {},
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  disabled = false,
  className,
  hideOnSinglePage = false,
  showLabels = false,
}: TablePaginationCursorProps) {
  const currentPage = Math.max(1, pageNumber ?? 1);
  const isLoadMore = cursorVariant === "load-more";
  const shouldHide = hideOnSinglePage
    ? !hasPrevious && !hasMore
    : rowCount === 0 && !hasPrevious && !isLoadMore;
  if (shouldHide) return null;

  return (
    <nav aria-label="Pagination" className={cn(SHELL_CLASS, className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="min-w-0 truncate text-left text-xs text-muted-foreground tabular-nums">
          {rowCount === 1
            ? "1 result shown"
            : `${rowCount} results shown`}
        </span>
        <PageSizeSelect
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
          disabled={disabled}
        />
      </div>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-0.5">
        {!isLoadMore ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-7", showLabels ? "gap-1 px-2 text-xs" : "px-1.5")}
            disabled={disabled || !hasPrevious}
            onClick={onPrevious}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {showLabels ? "Previous" : null}
          </Button>
        ) : null}
        <span
          className="min-w-[4.5rem] px-1 text-center text-xs font-medium text-foreground tabular-nums"
          aria-label={
            isLoadMore
              ? `${currentPage} ${currentPage === 1 ? "page" : "pages"} loaded`
              : `Current page ${currentPage}`
          }
          aria-current={isLoadMore ? undefined : "page"}
          aria-live={isLoadMore ? "polite" : undefined}
        >
          {isLoadMore
            ? `${currentPage} ${currentPage === 1 ? "page" : "pages"} loaded`
            : `Page ${currentPage}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7",
            isLoadMore || showLabels ? "gap-1 px-2 text-xs" : "px-1.5",
          )}
          disabled={disabled || !hasMore}
          onClick={onNext}
          aria-label={isLoadMore ? (hasMore ? "Load more" : "All results loaded") : "Next page"}
        >
          {isLoadMore ? (hasMore ? "Load more" : "All results loaded") : showLabels ? "Next" : null}
          {isLoadMore && !hasMore ? null : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </nav>
  );
}

export function TablePagination(props: TablePaginationProps) {
  if (props.mode === "cursor") return <CursorFooter {...props} />;
  return <OffsetFooter {...props} />;
}
