"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, EyeIcon } from "@animateicons/react/lucide";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { AdminExpenseItem } from "./expense-item";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format-utils";
import { viewFile } from "@/hooks/common/use-file-url";
import {
  getCategoryConfig,
  STATUS_STYLES,
  STATUS_LABELS,
} from "./expense-constants";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import type { ExpenseToEdit } from "@/features/hr/expenses/components/create-expense-dialog";
import type { StatusFilter } from "./expense-constants";

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
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
  onRejectionReasonChange,
  onPageChange,
  onShowAll,
}: AdminExpenseListProps) {
  function handlePrevious() {
    onPageChange(pagination.page - 1);
  }
  function handleNext() {
    onPageChange(pagination.page + 1);
  }

  return (
    <Card className="rounded-lg border border-border overflow-hidden">
      <CardContent className="p-0 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
          <h3 className="text-sm font-semibold text-foreground">
            Expense Claims
          </h3>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {startItem}–{endItem} of {pagination.total}{" "}
            {statusFilter === "PENDING" ? "pending" : "total"}
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <EmptyExpensesIllustration className="h-5 w-5 opacity-60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No expenses found
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "No expense claims to review"}
              </p>
            </div>
            {statusFilter !== "ALL" && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 mt-1"
                onClick={onShowAll}
              >
                Show All Claims
              </Button>
            )}
          </div>
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
                onApprove={onApprove}
                onRejectStart={onRejectStart}
                onRejectConfirm={onRejectConfirm}
                onRejectCancel={onRejectCancel}
                onRejectionReasonChange={onRejectionReasonChange}
              />
            ))}
          </div>
        )}

        {pagination.total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/40">
            <span className="text-xs text-muted-foreground">
              Showing{" "}
              <strong className="font-semibold text-foreground">{startItem}</strong>{" "}
              to{" "}
              <strong className="font-semibold text-foreground">{endItem}</strong>{" "}
              of{" "}
              <strong className="font-semibold text-foreground">
                {pagination.total}
              </strong>{" "}
              results
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                disabled={pagination.page <= 1}
                onClick={handlePrevious}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {pagination.page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                disabled={pagination.page >= totalPages}
                onClick={handleNext}
              >
                Next
              </Button>
            </div>
          </div>
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
            ? "border-l-amber-400"
            : status === "APPROVED"
              ? "border-l-emerald-400"
              : status === "REJECTED"
                ? "border-l-rose-400"
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
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
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
        return formatINR(expense.amount);
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
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
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
          if (expense.receiptUrl) {
            viewFile(expense.receiptUrl);
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

  const emptyState = (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[220px] gap-3">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <EmptyExpensesIllustration className="h-5 w-5 opacity-60" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          No expenses found
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {statusFilter !== "ALL" || activeFilterCount > 0
            ? "Try adjusting your filters"
            : "Submit your first expense claim to get started"}
        </p>
      </div>
      {statusFilter !== "ALL" ? (
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 mt-1"
          onClick={onShowAll}
        >
          Show All Claims
        </Button>
      ) : (
        <AnimatedIconButton
          icon={PlusIcon}
          iconSize={14}
          iconClassName="mr-1.5"
          size="sm"
          className="text-xs gap-1.5 mt-1"
          onClick={onCreateNew}
        >
          Submit New Claim
        </AnimatedIconButton>
      )}
    </div>
  );

  return (
    <Card className="rounded-lg border border-border overflow-hidden">
      <CardContent className="p-0 flex flex-col" aria-live="polite">
        <DataTable
          data={expenses}
          columns={columns}
          getRowKey={(expense) => expense.id}
          pagination={{
            mode: "server",
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange,
          }}
          emptyState={emptyState}
          minWidth="640px"
        />
      </CardContent>
    </Card>
  );
}
