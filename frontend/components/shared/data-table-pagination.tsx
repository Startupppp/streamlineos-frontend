"use client";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";

interface PaginationChrome {
  limit: number;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
}

interface OffsetPaginationProps extends PaginationChrome {
  mode?: "offset";
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  rowCount?: never;
  pageNumber?: never;
  hasMore?: never;
  hasPrevious?: never;
  onNext?: never;
  onPrevious?: never;
}

/**
 * A keyset page knows only what it holds and whether anything follows, so
 * first/last and page numbers are not merely hidden here — they are absent
 * from the type. The inactive half of each variant is `never` so the two
 * cannot be mixed even by spreading a wider object.
 */
interface CursorPaginationProps extends PaginationChrome {
  mode: "cursor";
  /** Rows on this page — the only count that exists here. */
  rowCount: number;
  /**
   * Position in the walk, 1-based, when the caller keeps one. Not a page number
   * a caller may jump to, so it is shown and never offered as a control.
   */
  pageNumber?: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  page?: never;
  totalPages?: never;
  total?: never;
  onPageChange?: never;
}

export type DataTablePaginationProps = OffsetPaginationProps | CursorPaginationProps;

const NAV_CLASS =
  "flex min-w-0 flex-row items-center justify-between gap-2 px-0 py-1.5";

function PageSizeSelect({ limit, onLimitChange, pageSizeOptions }: PaginationChrome) {
  if (!onLimitChange) return null;

  function handleLimitChange(value: string) {
    onLimitChange?.(Number(value));
  }

  return (
    <div className="flex items-center gap-1">
      <span className="sr-only sm:not-sr-only">Rows</span>
      <Select value={String(limit)} onValueChange={handleLimitChange}>
        <SelectTrigger className="h-7 w-[4.75rem] px-2 text-xs" aria-label="Rows per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(pageSizeOptions ?? STANDARD_PAGE_SIZE_OPTIONS).map((n) => (
            <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CursorPagination({
  limit, onLimitChange, pageSizeOptions,
  rowCount, pageNumber, hasMore, hasPrevious, onNext, onPrevious,
}: CursorPaginationProps) {
  // An empty page reached by Next still owes the reader a way back.
  if (rowCount === 0 && !hasPrevious) return null;

  return (
    <nav aria-label="Pagination" className={NAV_CLASS}>
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="min-w-0 truncate tabular-nums">
          {rowCount === 1 ? "1 result on this page" : `${rowCount} results on this page`}
          {pageNumber ? ` · page ${pageNumber}` : null}
        </span>
        <PageSizeSelect limit={limit} onLimitChange={onLimitChange} pageSizeOptions={pageSizeOptions} />
      </div>

      <div className="flex items-center gap-0.5">
        <Button variant="outline" size="icon" className="size-7" disabled={!hasPrevious} onClick={onPrevious} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="size-7" disabled={!hasMore} onClick={onNext} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}

function OffsetPagination({
  page, totalPages, total, limit, onPageChange, onLimitChange, pageSizeOptions,
}: OffsetPaginationProps) {
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
    <nav aria-label="Pagination" className={NAV_CLASS}>
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="min-w-0 truncate tabular-nums">Showing {start}-{end} of {total}</span>
        <PageSizeSelect limit={limit} onLimitChange={onLimitChange} pageSizeOptions={pageSizeOptions} />
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
    </nav>
  );
}

export function DataTablePagination(props: DataTablePaginationProps) {
  if (props.mode === "cursor") return <CursorPagination {...props} />;
  return <OffsetPagination {...props} />;
}
