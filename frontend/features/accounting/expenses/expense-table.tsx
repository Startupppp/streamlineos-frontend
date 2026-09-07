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
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ExpenseStatus } from "@/features/accounting/shared";
import { formatShortDate } from "@/lib/date-utils";

type ExpenseWithExtras = ExpenseWithRelations & { policyFlag?: string; taxAmount?: string };

const EXPENSE_STATUS_VALUES: ReadonlyArray<string> = ["DRAFT", "SUBMITTED", "APPROVED", "REIMBURSEMENT_PENDING", "REIMBURSED", "REJECTED"];

function isExpenseStatus(v: string | null | undefined): v is ExpenseStatus {
  if (!v) return false;
  return EXPENSE_STATUS_VALUES.includes(v);
}

interface ExpenseTableProps {
  data: ExpenseWithExtras[];
  isLoading?: boolean;
  onRowClick: (row: ExpenseWithExtras) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyState: ReactNode;
  className?: string;
}

const COLUMNS: DataTableColumn<ExpenseWithExtras>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => {
      const displayName = getUserDisplayName(row.user);
      const initials = getUserInitials(row.user);
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-micro bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <TruncatedText text={displayName} className="text-sm" />
        </div>
      );
    },
  },
  {
    key: "date",
    header: "Date",
    cell: (row) => <span className="text-sm text-muted-foreground">{formatShortDate(row.expenseDate) || "—"}</span>,
  },
  {
    key: "merchant",
    header: "Merchant",
    cell: (row) => row.merchant ? (
      <TruncatedText text={row.merchant} className="text-sm" />
    ) : (
      <span className="text-sm text-muted-foreground">—</span>
    ),
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
      const tax = row.taxAmount;
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
      if (!isExpenseStatus(row.status)) return null;
      return <FinanceStatusBadge status={row.status} />;
    },
  },
  {
    key: "flags",
    header: "",
    className: "w-12",
    cell: (row) => {
      const flag = row.policyFlag;
      const hasReceipt = !!row.receiptUrl;
      return (
        <div className="flex items-center gap-1">
          {flag && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <AlertTriangle className="h-3.5 w-3.5 text-status-warning-ink" />
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
  className,
}: ExpenseTableProps) {
  const getRowKey = useCallback((row: ExpenseWithExtras) => row.id, []);

  return (
    <DataTable
      className={className}
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
