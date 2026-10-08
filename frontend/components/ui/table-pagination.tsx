"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  compact = true,
  showSummary = true,
}: TablePaginationCursorProps) {
  const currentPage = Math.max(1, pageNumber ?? 1);
  const isLoadMore = cursorVariant === "load-more";
  const isCompact = compact && !isLoadMore;
  const shouldHide = hideOnSinglePage
    ? !hasPrevious && !hasMore
    : rowCount === 0 && !hasPrevious && !isLoadMore;
  if (shouldHide) return null;

  return (
    <nav aria-label="Pagination" className={cn(SHELL_CLASS, className)}>
      <div className="min-w-0 flex items-center gap-1.5">
        {showSummary ? (
          <span className="min-w-0 truncate text-left text-xs text-muted-foreground tabular-nums" aria-label={isCompact ? `${rowCount} results shown` : undefined}>
            {isCompact ? rowCount : rowCount === 1
              ? (
                  <>
                    <span className="sm:hidden">1</span>
                    <span className="hidden sm:inline">1 result shown</span>
                  </>
                )
              : (
                  <>
                    <span className="sm:hidden">{rowCount}</span>
                    <span className="hidden sm:inline">{`${rowCount} results shown`}</span>
                  </>
                )}
          </span>
        ) : null}
        <PageSizeSelect
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
          disabled={disabled}
        />
      </div>

      <div className="col-start-2 flex shrink-0 flex-nowrap items-center justify-center gap-1">
        {!isLoadMore ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || !hasPrevious}
            onClick={onPrevious}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        <span
          className={cn(
            "inline-flex h-8 items-center justify-center rounded-md border border-border/70 bg-muted/50 px-2 text-xs font-medium text-foreground tabular-nums",
            isCompact ? "min-w-8" : "min-w-[4.5rem]",
          )}
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
            : isCompact ? currentPage : `Page ${currentPage}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={disabled || !hasMore}
          onClick={onNext}
          aria-label={isLoadMore ? (hasMore ? "Load more" : "All results loaded") : "Next page"}
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export function TablePagination(props: TablePaginationProps) {
  if (props.mode === "cursor") return <CursorFooter {...props} />;
  return <OffsetFooter {...props} />;
}

export function TablePaginationSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(SHELL_CLASS, className)} aria-label="Loading pagination">
      <Skeleton className="col-start-2 h-8 w-[12.5rem] justify-self-center rounded-md" />
    </div>
  );
}
