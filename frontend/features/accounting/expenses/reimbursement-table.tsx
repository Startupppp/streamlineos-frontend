"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { getUserDisplayName } from "@/lib/person-display";
import type { FinReimbursementBatch, ReimbursementBatchStatus } from "@/types/accounting/expenses";
import type { FinanceStatus } from "@/features/accounting/shared";
import { formatShortDate } from "@/lib/date-utils";

const STATUS_MAP: Record<ReimbursementBatchStatus, FinanceStatus> = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  PAID: "PAID",
};

interface ReimbursementTableProps {
  data: FinReimbursementBatch[];
  isLoading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyState: ReactNode;
  className?: string;
}

const COLUMNS: DataTableColumn<FinReimbursementBatch>[] = [
  {
    key: "name",
    header: "Batch name",
    cell: (row) => (
      <Link
        href={`/accounting/expenses/reimbursements/${row.id}`}
        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.name}
      </Link>
    ),
  },
  {
    key: "created",
    header: "Created",
    cell: (row) => <span className="text-sm text-muted-foreground">{formatShortDate(row.createdAt) || "—"}</span>,
  },
  {
    key: "createdBy",
    header: "Created by",
    cell: (row) => <span className="text-sm">{getUserDisplayName(row.creator)}</span>,
  },
  {
    key: "total",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => <Money value={parseFloat(row.totalAmount)} className="text-sm font-medium" />,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <FinanceStatusBadge status={STATUS_MAP[row.status]} />,
  },
];

export function ReimbursementTable({
  data,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  emptyState,
  className,
}: ReimbursementTableProps) {
  const getRowKey = useCallback((row: FinReimbursementBatch) => row.id, []);

  return (
    <DataTable
      className={className}
      data={data}
      columns={COLUMNS}
      getRowKey={getRowKey}
      isLoading={isLoading}
      emptyState={emptyState}
      pagination={{
        mode: "server",
        page,
        pageSize,
        total,
        onPageChange,
      }}
    />
  );
}
