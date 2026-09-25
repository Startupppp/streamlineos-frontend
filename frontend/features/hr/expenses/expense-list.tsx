"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EyeIcon } from "@animateicons/react/lucide";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { AdminExpenseItem } from "./expense-item";
import { cn } from "@/lib/utils";
import { formatAmountInCurrency } from "@/lib/format-utils";
import { viewFile } from "@/hooks/common/use-file-url";
import {
  getCategoryConfig,
  STATUS_STYLES,
  STATUS_LABELS,
  parseExpenseReceipts,
} from "@/lib/expense-constants";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import type { ExpenseToEdit } from "@/features/hr/expenses/components/create-expense-dialog";
import type { StatusFilter } from "@/lib/expense-constants";

interface AdminExpenseListProps {
  expenses: ExpenseWithRelations[];
  currentUserId?: string;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  startItem: number;
  endItem: number;
  totalPages: number;
  statusFilter: StatusFilter;
  rejectingId: number | null;
  rejectionReason: string;
  isPending: boolean;
  pendingId: number | null;
  onApprove: (id: number) => void;
  onRejectStart: (id: number) => void;
  onRejectConfirm: (id: number) => void;
  onRejectCancel: () => void;
  onRejectionReasonChange: (reason: string) => void;
  onPageChange: (page: number) => void;
  onShowAll: () => void;
}

export function AdminExpenseList({
  expenses,
  currentUserId,
  pagination,
  startItem,
  endItem,
  totalPages,
  statusFilter,
  rejectingId,
  rejectionReason,
  isPending,
  pendingId,
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
  onRejectionReasonChange,
  onPageChange,
  onShowAll,
}: AdminExpenseListProps) {
  return (
    <Card className="rounded-lg border border-border overflow-hidden">
      <CardContent className="p-0 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
          <h3 className="text-sm font-semibold text-foreground">
            Expense Claims
          </h3>
          <span className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
            {startItem}–{endItem} of {pagination.total}{" "}
            {statusFilter === "PENDING" ? "pending" : "total"}
          </span>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            compact
            className="flex-1 border-0 bg-transparent"
            illustration={<EmptyExpensesIllustration className="h-8 w-8 text-muted-foreground" />}
            title="No expenses found"
            description={statusFilter !== "ALL" ? "Try adjusting your filters" : "No expense claims to review"}
            action={statusFilter !== "ALL" ? { label: "Show All Claims", onClick: onShowAll } : undefined}
          />
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <AdminExpenseItem
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
                rejectingId={rejectingId}
                rejectionReason={rejectionReason}
                isPending={isPending}
                pendingId={pendingId}
                onApprove={onApprove}
                onRejectStart={onRejectStart}
                onRejectConfirm={onRejectConfirm}
                onRejectCancel={onRejectCancel}
                onRejectionReasonChange={onRejectionReasonChange}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <TablePagination
            className="border-t px-6 py-3"
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={onPageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface MemberExpenseListProps {
  expenses: ExpenseWithRelations[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  startItem: number;
  endItem: number;
  totalPages: number;
  statusFilter: StatusFilter;
  activeFilterCount: number;
  onEdit: (expense: ExpenseToEdit) => void;
  onResubmit: (expense: ExpenseWithRelations) => void;
  onShowAll: () => void;
  onCreateNew: () => void;
  onPageChange: (page: number) => void;
}

export function MemberExpenseList({
  expenses,
  pagination,
  statusFilter,
  activeFilterCount,
  onEdit,
  onResubmit,
  onShowAll,
  onCreateNew,
  onPageChange,
}: MemberExpenseListProps) {
  const columns = useMemo<DataTableColumn<ExpenseWithRelations>[]>(() => [
    {
      key: "claimId",
      header: "Claim ID",
      cell(expense) {
        const status = expense.status || "PENDING";
        const statusBorderClass =
          status === "PENDING"
            ? "border-l-status-warning-rule"
            : status === "APPROVED"
              ? "border-l-status-success-rule"
              : status === "REJECTED"
                ? "border-l-status-danger-rule"
                : "border-l-border";
        return (
          <span
            className={cn(
              "text-xs font-semibold tabular-nums border-l-4 pl-2",
              statusBorderClass,
            )}
          >
            #EXP-{new Date(expense.expenseDate).getFullYear()}-
            {expense.id.toString().padStart(3, "0")}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell text-xs text-muted-foreground",
      cell(expense) {
        return format(new Date(expense.expenseDate), "MMM dd, yyyy");
      },
    },
    {
      key: "category",
      header: "Category",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell(expense) {
        const catConfig = getCategoryConfig(expense.category || "Other");
        const CatIcon = catConfig.icon;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
              catConfig.bg,
              catConfig.text,
            )}
          >
            <CatIcon className="h-3 w-3" />
            {catConfig.label}
          </span>
        );
      },
    },
    {
      key: "description",
      header: "Description",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell text-xs text-foreground max-w-[200px] truncate",
      cell(expense) {
        return expense.description || expense.merchant || "-";
      },
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "font-mono text-sm text-right",
      cell(expense) {
        return formatAmountInCurrency(expense.amount, expense.currency);
      },
    },
    {
      key: "status",
      header: "Status",
      cell(expense) {
        const status = expense.status || "PENDING";
        const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES["PENDING"];
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
              statusStyle.bg,
              statusStyle.text,
              statusStyle.border,
            )}
          >
            {status === "PAID" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : status === "REJECTED" ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <span className={cn("size-1.5 rounded-full", statusStyle.dot)} />
            )}
            {STATUS_LABELS[status] ?? status}
          </span>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      cell(expense) {
        const status = expense.status || "PENDING";
        const canResubmit = status === "REJECTED";
        const canEdit = status === "PENDING";

        function toEditPayload(): ExpenseToEdit {
          return {
            id: expense.id,
            category: expense.category || "",
            amount: expense.amount,
            description: expense.description,
            merchant: expense.merchant,
            paymentMethod: expense.paymentMethod,
            expenseDate: expense.expenseDate,
            receiptUrl: expense.receiptUrl,
            receiptFileName: expense.receiptFileName,
          };
        }

        function handleResubmit() {
          onResubmit(expense);
        }
        function handleEdit() {
          onEdit(toEditPayload());
        }
        function handleView() {
          const receipts = parseExpenseReceipts(expense.receiptUrl, expense.receiptFileName);
          if (receipts[0]) {
            viewFile(receipts[0].url);
          } else {
            onEdit(toEditPayload());
          }
        }

        if (canResubmit) {
          return (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
              onClick={handleResubmit}
            >
              Resubmit
            </Button>
          );
        }
        if (canEdit) {
          return (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
              onClick={handleEdit}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          );
        }
        return (
          <AnimatedIconButton
            icon={EyeIcon}
            iconSize={14}
            variant="ghost"
            size="icon"
            className="w-8 text-muted-foreground hover:text-foreground"
            onClick={handleView}
            aria-label="View"
          />
        );
      },
    },
  ], [onEdit, onResubmit]);

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-live="polite">
      <DataTable
        data={expenses}
        columns={columns}
        getRowKey={(expense) => expense.id}
        className="min-h-0 flex-1"
        pagination={{
          mode: "server",
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange,
        }}
        emptyState={
          <EmptyState
            illustration={<EmptyExpensesIllustration className="h-full w-full" />}
            title="No expenses found"
            description={
              statusFilter !== "ALL" || activeFilterCount > 0
                ? "Try adjusting your filters"
                : "Submit your first expense claim to get started"
            }
            action={
              statusFilter !== "ALL"
                ? { label: "Show All Claims", onClick: onShowAll }
                : { label: "Submit New Claim", onClick: onCreateNew }
            }
            className={PAGE_BODY_EMPTY_CLASS}
          />
        }
        minWidth="640px"
      />
    </div>
  );
}
