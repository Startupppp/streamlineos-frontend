"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { numericSelectChange } from "@/lib/numeric-field";

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

interface TablePaginationCursorBase extends TablePaginationChrome {
  mode: "cursor";
  rowCount: number;

  /** Required by canonical callers; optional here only for legacy non-Build consumers. */
  pageNumber?: number;
  hasMore: boolean;
  onNext: () => void;
  pageSize?: number;
  hideOnSinglePage?: boolean;
  showLabels?: boolean;
  page?: never;
  total?: never;
  onPageChange?: never;
  showPageNumbers?: never;
  showEdgeJumps?: never;
}

export type TablePaginationCursorProps = TablePaginationCursorBase &
  (
    | {
        cursorVariant?: "paged";
        hasPrevious: boolean;
        onPrevious: () => void;
      }
    | {
        cursorVariant: "load-more";
        hasPrevious?: never;
        onPrevious?: never;
      }
  );

export type TablePaginationProps =
  | TablePaginationOffsetProps
  | TablePaginationCursorProps;

export const SHELL_CLASS =
  "flex shrink-0 flex-row flex-nowrap items-center justify-between gap-2 border-t border-border/60 bg-card px-2 py-1.5 max-md:[.mobile-nav-active_&]:pr-14";

export function getVisiblePageItems(
  totalPages: number,
  currentPage: number,
): (number | "gap")[] {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, currentPage), total);
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  if (current <= 4) return [1, 2, 3, 4, 5, "gap", total];
  if (current >= total - 3) {
    return [1, "gap", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "gap", current - 1, current, current + 1, "gap", total];
}

export interface CursorPager {
  cursor: string | undefined;
  /** One-based position in the cursor walk. This is display-only, not jumpable. */
  pageNumber: number;
  hasPrevious: boolean;
  goNext: (nextCursor: string | null | undefined) => void;
  goPrevious: () => void;
  reset: () => void;
}

export interface CursorPagerUrlOptions {
  initialCursor: string | undefined;
  onCursorChange: (cursor: string | undefined) => void;
}

export function useCursorPager(resetKey?: string, urlOptions?: CursorPagerUrlOptions): CursorPager {
  const [stack, setStack] = useState<(string | undefined)[]>(() => {
    const c = urlOptions?.initialCursor;
    return c !== undefined ? [undefined, c] : [undefined];
  });
  const [appliedKey, setAppliedKey] = useState(resetKey);

  if (appliedKey !== resetKey) {
    setAppliedKey(resetKey);
    setStack([undefined]);
  }

  const currentCursor = stack[stack.length - 1];
  const onCursorChangeRef = useRef(urlOptions?.onCursorChange);
  onCursorChangeRef.current = urlOptions?.onCursorChange;
  const emittedCursor = useRef(currentCursor);

  useEffect(() => {
    if (emittedCursor.current === currentCursor) return;
    emittedCursor.current = currentCursor;
    onCursorChangeRef.current?.(currentCursor);
  }, [currentCursor]);

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
      pageNumber: stack.length,
      hasPrevious: stack.length > 1,
      goNext,
      goPrevious,
      reset,
    }),
    [stack, goNext, goPrevious, reset],
  );
}

export function PageSizeSelect({
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
