"use client";

import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { TablePagination } from "./table-pagination";

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
    <TablePagination
      mode="cursor"
      compact
      rowCount={1}
      pageNumber={page}
      hasPrevious={page > 1}
      hasMore={hasNext}
      onPrevious={onPrevious}
      onNext={onNext}
      pageSize={pageSize}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      disabled={disabled}
      showSummary={false}
      className={className}
    />
  );
}
