"use client";

import { useCallback, type ReactNode } from "react";
import { AlertTriangle, Paperclip } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import type { ExpenseStatus } from "@/features/accounting/shared";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type ExpenseWithExtras = ExpenseWithRelations & { policyFlag?: string; taxAmount?: string };

interface ExpenseTableProps {
  data: ExpenseWithRelations[];
  isLoading?: boolean;
  onRowClick: (row: ExpenseWithRelations) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyState: ReactNode;
}

const COLUMNS: DataTableColumn<ExpenseWithRelations>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => {
      const displayName = getUserDisplayName(row.user);
      const initials = getUserInitials(row.user);
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm truncate">{displayName}</span>
        </div>
      );
    },
  },
  {
    key: "date",
    header: "Date",
    cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.expenseDate)}</span>,
  },
  {
    key: "merchant",
    header: "Merchant",
    cell: (row) => <span className="text-sm">{row.merchant ?? "—"}</span>,
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => <span className="text-sm text-muted-foreground">{row.category}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => <Money value={parseFloat(row.amount)} className="text-sm" />,
  },
  {
    key: "tax",
    header: "Tax",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const tax = (row as ExpenseWithExtras).taxAmount;
      return tax ? (
        <Money value={parseFloat(tax)} className="text-xs text-muted-foreground" />
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => {
      const status = row.status as ExpenseStatus | null;
      if (!status) return null;
      return <FinanceStatusBadge status={status} />;
    },
  },
  {
    key: "flags",
    header: "",
    className: "w-12",
    cell: (row) => {
      const flag = (row as ExpenseWithExtras).policyFlag;
      const hasReceipt = !!row.receiptUrl;
      return (
        <div className="flex items-center gap-1">
          {flag && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {flag === "OVER_LIMIT" ? "Exceeds policy limit" : "Receipt required per policy"}
              </TooltipContent>
            </Tooltip>
          )}
          {hasReceipt && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Receipt attached</TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    },
  },
];

export function ExpenseTable({
  data,
  isLoading,
  onRowClick,
  page,
  pageSize,
  total,
  onPageChange,
  emptyState,
}: ExpenseTableProps) {
  const getRowKey = useCallback((row: ExpenseWithRelations) => row.id, []);

  return (
    <DataTable
      data={data}
      columns={COLUMNS}
      getRowKey={getRowKey}
      onRowClick={onRowClick}
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
