"use client";

import { TablePagination } from "@/components/ui/table-pagination";
import type { CursorPagination } from "./data-table.types";

export function DataTableFooter({
  cursor,
  page,
  total,
  limit,
  rowCount,
  onPageChange,
  onLimitChange,
  pageSizeOptions,
}: {
  cursor: CursorPagination | null;
  page: number;
  total: number;
  limit: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
}) {
  if (cursor) {
    return (
      <TablePagination
        mode="cursor"
        rowCount={rowCount}
        pageNumber={cursor.pageNumber}
        hasMore={cursor.hasMore}
        hasPrevious={cursor.hasPrevious}
        onNext={cursor.onNext}
        onPrevious={cursor.onPrevious}
        pageSize={limit}
        onPageSizeChange={cursor.onPageSizeChange}
        pageSizeOptions={cursor.pageSizeOptions}
      />
    );
  }

  return (
    <TablePagination
      page={page}
      pageSize={limit}
      total={total}
      onPageChange={onPageChange}
      showEdgeJumps
      onPageSizeChange={onLimitChange}
      pageSizeOptions={pageSizeOptions}
    />
  );
}
