"use client";

import { DataTablePagination } from "@/components/shared/data-table-pagination";
import type { CursorPagination } from "./data-table.types";

/**
 * `DataTable`'s pagination footer, and the one place that decides which of the
 * two footer shapes a table gets. It lives beside the table rather than inside
 * it so the cursor branch cannot drift into reporting a total: a keyset page
 * knows its own length and whether anything follows, and that is all this is
 * given.
 */
export function DataTableFooter({
  cursor,
  page,
  totalPages,
  total,
  limit,
  rowCount,
  onPageChange,
  onLimitChange,
  pageSizeOptions,
}: {
  cursor: CursorPagination | null;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
}) {
  return (
    <div className="shrink-0 border-t px-2">
      {cursor ? (
        <DataTablePagination
          mode="cursor"
          limit={limit}
          rowCount={rowCount}
          hasMore={cursor.hasMore}
          hasPrevious={cursor.hasPrevious}
          onNext={cursor.onNext}
          onPrevious={cursor.onPrevious}
          onLimitChange={cursor.onPageSizeChange}
          pageSizeOptions={cursor.pageSizeOptions}
        />
      ) : (
        <DataTablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
