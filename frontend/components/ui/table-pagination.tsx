"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { numericSelectChange } from "@/lib/numeric-field";
import { cn } from "@/lib/utils";

interface TablePaginationChrome {
  disabled?: boolean;
  className?: string;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}

export interface TablePaginationOffsetProps extends TablePaginationChrome {
  mode?: "offset";
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  showEdgeJumps?: boolean;
  rowCount?: never;
  pageNumber?: never;
  hasMore?: never;
  hasPrevious?: never;
  onNext?: never;
  onPrevious?: never;
}

export interface TablePaginationCursorProps extends TablePaginationChrome {
  mode: "cursor";
  /** Rows on the page currently rendered. Never a total — a keyset list has none. */
  rowCount: number;

  pageNumber?: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pageSize?: number;
  page?: never;
  total?: never;
  onPageChange?: never;
  showPageNumbers?: never;
  showEdgeJumps?: never;
}

export type TablePaginationProps =
  | TablePaginationOffsetProps
  | TablePaginationCursorProps;

const SHELL_CLASS =
  "flex shrink-0 flex-row flex-nowrap items-center justify-between gap-2 border-t border-border/60 bg-card px-2 py-1.5";

export function getVisiblePageItems(totalPages: number): (number | "gap")[] {
  const total = Math.max(1, totalPages);
  if (total <= 4) return Array.from({ length: total }, (_, i) => i + 1);
  return [1, 2, "gap", total - 1, total];
}

export interface CursorPager {
  cursor: string | undefined;
  hasPrevious: boolean;
  goNext: (nextCursor: string | null | undefined) => void;
  goPrevious: () => void;
  reset: () => void;
}

export function useCursorPager(resetKey?: string): CursorPager {
  const [stack, setStack] = useState<(string | undefined)[]>([undefined]);
  const [appliedKey, setAppliedKey] = useState(resetKey);

  if (appliedKey !== resetKey) {
    setAppliedKey(resetKey);
    setStack([undefined]);
  }

  const goNext = useCallback((nextCursor: string | null | undefined) => {
    if (!nextCursor) return;
    setStack((prev) => [...prev, nextCursor]);
  }, []);

  const goPrevious = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const reset = useCallback(() => {
    setStack([undefined]);
  }, []);

  return useMemo(
    () => ({
      cursor: stack[stack.length - 1],
      hasPrevious: stack.length > 1,
      goNext,
      goPrevious,
      reset,
    }),
    [stack, goNext, goPrevious, reset],
  );
}

function PageSizeSelect({
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  disabled,
}: {
  pageSize: number | undefined;
  onPageSizeChange: ((pageSize: number) => void) | undefined;
  pageSizeOptions: readonly number[] | undefined;
  disabled: boolean;
}) {
  if (!onPageSizeChange || pageSize === undefined) return null;

  return (
    <Select
      value={String(pageSize)}
      onValueChange={numericSelectChange(onPageSizeChange)}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-7 w-[4.75rem] px-2 text-xs"
        aria-label="Rows per page"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(pageSizeOptions ?? STANDARD_PAGE_SIZE_OPTIONS).map((size) => (
          <SelectItem key={size} value={String(size)} className="text-xs">
            {size}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
}: TablePaginationCursorProps) {
  if (rowCount === 0 && !hasPrevious) return null;

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
          className="h-7 px-1.5"
          disabled={disabled || !hasPrevious}
          onClick={onPrevious}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-1.5"
          disabled={disabled || !hasMore}
          onClick={onNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}

function OffsetFooter({
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
  const pageItems = getVisiblePageItems(totalPages);

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

export function TablePagination(props: TablePaginationProps) {
  if (props.mode === "cursor") return <CursorFooter {...props} />;
  return <OffsetFooter {...props} />;
}
