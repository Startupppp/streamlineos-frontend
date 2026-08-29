"use client";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";

interface PaginationProps {
  mode?: "page";
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
}

/**
 * A keyset-paginated list, which cannot offer the controls above it.
 *
 * There is no total, so there is no last page to jump to, no "of 92", and no
 * numbered buttons — the server was never asked how many rows match, because
 * counting them is most of what offset pagination costs on a large tenant. What
 * a cursor list knows is where it is standing and whether there is more, so that
 * is what the footer says.
 */
interface CursorPaginationProps {
  mode: "cursor";
  /** Position in the walk, 1-based. Not a page number a caller may jump to. */
  page: number;
  /** Rows on this page — the only count that exists here. */
  shown: number;
  limit: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
}

function PageSizeControl({
  limit,
  onLimitChange,
  pageSizeOptions,
}: {
  limit: number;
  onLimitChange: (limit: number) => void;
  pageSizeOptions: readonly number[];
}) {
  function handleLimitChange(value: string) {
    onLimitChange(Number(value));
  }

  return (
    <div className="flex items-center gap-1">
      <span className="sr-only sm:not-sr-only">Rows</span>
      <Select value={String(limit)} onValueChange={handleLimitChange}>
        <SelectTrigger className="h-7 w-[4.75rem] px-2 text-xs" aria-label="Rows per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((n) => (
            <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CursorPagination({
  page, shown, limit, hasMore, hasPrevious, onNext, onPrevious, onLimitChange,
  pageSizeOptions = STANDARD_PAGE_SIZE_OPTIONS,
}: CursorPaginationProps) {
  if (shown === 0 && !hasPrevious) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-1.5 px-0 py-1.5 sm:flex-row sm:gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="tabular-nums">Showing {shown} · page {page}</span>
        {onLimitChange ? (
          <PageSizeControl limit={limit} onLimitChange={onLimitChange} pageSizeOptions={pageSizeOptions} />
        ) : null}
      </div>

      <div className="flex items-center gap-0.5">
        <Button variant="outline" size="icon" className="size-7" disabled={!hasPrevious} onClick={onPrevious} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="size-7" disabled={!hasMore} onClick={onNext} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DataTablePagination(props: PaginationProps | CursorPaginationProps) {
  if (props.mode === "cursor") return <CursorPagination {...props} />;
  return <PagePagination {...props} />;
}

function PagePagination({
  page, totalPages, total, limit, onPageChange, onLimitChange,
  pageSizeOptions = STANDARD_PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  function handleFirstPage() {
    onPageChange(1);
  }

  function handlePrevPage() {
    onPageChange(page - 1);
  }

  function handleNextPage() {
    onPageChange(page + 1);
  }

  function handleLastPage() {
    onPageChange(totalPages);
  }

  function makePageHandler(target: number) {
    return () => onPageChange(target);
  }

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const rangeStart = Math.max(2, page - 1);
      const rangeEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-1.5 px-0 py-1.5 sm:flex-row sm:gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="tabular-nums">Showing {start}-{end} of {total}</span>
        {onLimitChange ? (
          <PageSizeControl limit={limit} onLimitChange={onLimitChange} pageSizeOptions={pageSizeOptions} />
        ) : null}
      </div>

      <div className="flex items-center gap-0.5">
        <Button variant="outline" size="icon" className="size-7" disabled={page <= 1} onClick={handleFirstPage} aria-label="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="size-7" disabled={page <= 1} onClick={handlePrevPage} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="hidden items-center gap-0.5 sm:flex">
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground" aria-hidden>...</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                className={`size-7 text-xs ${p === page ? "bg-primary text-primary-foreground hover:bg-primary/80" : ""}`}
                onClick={makePageHandler(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}
        </div>
        <span className="px-1.5 text-xs tabular-nums text-muted-foreground sm:hidden">{page}/{totalPages}</span>

        <Button variant="outline" size="icon" className="size-7" disabled={page >= totalPages} onClick={handleNextPage} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="size-7" disabled={page >= totalPages} onClick={handleLastPage} aria-label="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
