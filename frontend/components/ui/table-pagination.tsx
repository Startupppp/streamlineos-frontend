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
  hasMore,
  hasPrevious,
  onNext,
  onPrevious,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  disabled = false,
  className,
  hideOnSinglePage = false,
  showLabels = false,
}: TablePaginationCursorProps) {
  const shouldHide = hideOnSinglePage
    ? !hasPrevious && !hasMore
    : rowCount === 0 && !hasPrevious;
  if (shouldHide) return null;

  return (
    <nav aria-label="Pagination" className={cn(SHELL_CLASS, className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="min-w-0 truncate text-left text-xs text-muted-foreground tabular-nums">
          {rowCount === 1
            ? "1 result on this page"
            : `${rowCount} results on this page`}
          {pageNumber ? ` · page ${pageNumber}` : null}
        </span>
        <PageSizeSelect
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
          disabled={disabled}
        />
      </div>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-0.5">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-7", showLabels ? "gap-1 px-2 text-xs" : "px-1.5")}
          disabled={disabled || !hasMore}
          onClick={onNext}
          aria-label="Next page"
        >
          {showLabels ? "Next" : null}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}

export function TablePagination(props: TablePaginationProps) {
  if (props.mode === "cursor") return <CursorFooter {...props} />;
  return <OffsetFooter {...props} />;
}
