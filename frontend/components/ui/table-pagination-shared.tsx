"use client";

import { useCallback, useMemo, useState } from "react";
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

export interface TablePaginationCursorProps extends TablePaginationChrome {
  mode: "cursor";
  rowCount: number;

  pageNumber?: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pageSize?: number;
  hideOnSinglePage?: boolean;
  showLabels?: boolean;
  page?: never;
  total?: never;
  onPageChange?: never;
  showPageNumbers?: never;
  showEdgeJumps?: never;
}

export type TablePaginationProps =
  | TablePaginationOffsetProps
  | TablePaginationCursorProps;

export const SHELL_CLASS =
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
