"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { cn } from "@/lib/utils";
import { numericSelectChange } from "@/lib/numeric-field";

interface CursorPageControlsProps {
  page: number;
  hasNext: boolean;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}

export function CursorPageControls({
  page,
  hasNext,
  disabled = false,
  onPrevious,
  onNext,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = STANDARD_PAGE_SIZE_OPTIONS,
  className,
}: CursorPageControlsProps) {
  return (
    <nav
      aria-label="List pages"
      /*
       * Below `sm` the two labels plus the rows-per-page select overflow the
       * row, and `Next` was the half that got cut (SETTINGS-010). The chevrons
       * carry the meaning on their own at that width; the words come back from
       * `sm` up, where they fit.
       */
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-border/70 px-2 py-2 sm:gap-3",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={onPrevious}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="max-sm:hidden">Previous</span>
      </Button>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>Page {page}</span>
        {pageSize !== undefined && onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={numericSelectChange(onPageSizeChange)}
          >
            <SelectTrigger className="h-8 w-[5.25rem]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !hasNext}
        onClick={onNext}
        aria-label="Next page"
      >
        <span className="max-sm:hidden">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
