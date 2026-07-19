"use client";

import { DataTablePagination } from "@/components/shared/data-table-pagination";

interface RecruitmentListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

/**
 * Shared list footer for recruitment pages — matches HRMS DataTable pagination.
 */
export function RecruitmentListPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  className,
}: RecruitmentListPaginationProps) {
  if (total <= 0) return null;

  return (
    <div className={className}>
      <DataTablePagination
        page={page}
        totalPages={Math.max(1, totalPages)}
        total={total}
        limit={pageSize}
        onPageChange={onPageChange}
        onLimitChange={onPageSizeChange}
      />
    </div>
  );
}
