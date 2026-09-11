"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Offset mode: the server knows how many rows there are, so the footer can
 * offer numbered pages and a "Showing 21–40 of 312" window.
 */
interface TablePaginationChrome {
  disabled?: boolean;
  className?: string;
}

export interface TablePaginationOffsetProps extends TablePaginationChrome {
  mode?: "offset";
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  rowCount?: never;
  hasMore?: never;
  hasPrevious?: never;
  onNext?: never;
  onPrevious?: never;
}

/**
 * Cursor mode: a keyset list has no total and no page index, so there is
 * nothing to number and nothing to divide. It renders prev/next only.
 *
 * The two shapes are a discriminated union whose inactive half is typed
 * `never` on every field, so the invalid state is unrepresentable in both
 * directions — a cursor caller cannot pass `total`, and an offset caller
 * cannot pass `hasMore`. Excess-property checking alone would only catch the
 * object-literal form; `never` also catches a spread of a wider variable.
 */
export interface TablePaginationCursorProps extends TablePaginationChrome {
  mode: "cursor";
  /** Rows on the page currently rendered. Never a total — a keyset list has none. */
  rowCount: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  page?: never;
  pageSize?: never;
  total?: never;
  onPageChange?: never;
  showPageNumbers?: never;
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

/**
 * The cursor stack a prev/next pager needs.
 *
 * A keyset cursor only walks forward, so "previous" is not a subtraction — it
 * is the cursor that produced the page before this one. Keeping that history
 * here is what stops each call site inventing its own array.
 *
 * A cursor is only valid for the query that minted it, so replaying one
 * against different filters returns a window from the wrong result set. Pass
 * `resetKey` — a string summarising the active filters and page size — and the
 * stack rewinds to the head during the render in which that key changes, which
 * is React's own "adjust state when an input changes" pattern rather than an
 * effect that would let one stale request go out first. `reset()` is the
 * imperative form for a call site that already has a handler.
 */
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

function CursorFooter({
  rowCount,
  hasMore,
  hasPrevious,
  onNext,
  onPrevious,
  disabled = false,
  className,
}: TablePaginationCursorProps) {
  return (
    <div className={cn(SHELL_CLASS, className)}>
      <p className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground tabular-nums">
        {rowCount === 1 ? "1 result on this page" : `${rowCount} results on this page`}
      </p>

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
    </div>
  );
}

function OffsetFooter({
  page,
  pageSize,
  total,
  onPageChange,
  showPageNumbers = true,
  disabled = false,
  className,
}: TablePaginationOffsetProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pageItems = getVisiblePageItems(totalPages);

  return (
    <div className={cn(SHELL_CLASS, className)}>
      <p className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground tabular-nums">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-0.5">
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
      </div>
    </div>
  );
}

export function TablePagination(props: TablePaginationProps) {
  if (props.mode === "cursor") return <CursorFooter {...props} />;
  return <OffsetFooter {...props} />;
}
