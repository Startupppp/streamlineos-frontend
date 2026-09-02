"use client";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
}

export function DataTablePagination({
  page, totalPages, total, limit, onPageChange, onLimitChange,
  pageSizeOptions = STANDARD_PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  function handleLimitChange(value: string) {
    onLimitChange?.(Number(value));
  }

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
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-1.5 px-0 py-1.5 sm:flex-row sm:gap-2"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="tabular-nums">Showing {start}-{end} of {total}</span>
        {onLimitChange ? (
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
    </nav>
  );
}
