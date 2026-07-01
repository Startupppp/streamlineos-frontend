"use client";

import { format } from "date-fns";
import {
  Receipt,
  Download,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatINR } from "@/lib/format-utils";
import { viewFile, downloadFile } from "@/hooks/common/use-file-url";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import type { ExpenseToEdit } from "@/features/hr/expenses/components/create-expense-dialog";
import {
  getCategoryConfig,
  ADMIN_CATEGORY_LABELS,
  STATUS_STYLES,
  STATUS_LABELS,
} from "./expense-constants";

interface AdminExpenseItemProps {
  expense: ExpenseWithRelations;
  currentUserId?: string;
  rejectingId: number | null;
  rejectionReason: string;
  isPending: boolean;
  onApprove: (id: number) => void;
  onRejectStart: (id: number) => void;
  onRejectConfirm: (id: number) => void;
  onRejectCancel: () => void;
  onRejectionReasonChange: (reason: string) => void;
}

export function AdminExpenseItem({
  expense,
  currentUserId,
  rejectingId,
  rejectionReason,
  isPending,
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
  onRejectionReasonChange,
}: AdminExpenseItemProps) {
  const status = expense.status || "PENDING";
  const catConfig = getCategoryConfig(expense.category || "Other");
  const CatIcon = catConfig.icon;
  const isRejecting = rejectingId === expense.id;
  const adminCatLabel =
    ADMIN_CATEGORY_LABELS[expense.category || ""] || catConfig.label;

  return (
    <div
      className={cn(
        "flex items-start gap-4 px-4 py-4 hover:bg-muted/20 transition-colors duration-200 border-l-4",
        status === "PENDING" && "border-l-amber-400",
        status === "APPROVED" && "border-l-emerald-400",
        status === "REJECTED" && "border-l-rose-400",
        status === "PAID" && "border-l-slate-400",
      )}
    >
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
        <div
          className={cn(
            "relative w-[96px] h-[76px] rounded-xl bg-muted/60 flex items-center justify-center overflow-hidden border border-border",
            expense.receiptUrl &&
              "cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all duration-200",
          )}
          onClick={() => expense.receiptUrl && viewFile(expense.receiptUrl)}
        >
          {expense.receiptUrl ? (
            <Image
              src={resolveImageUrl(expense.receiptUrl) || ""}
              alt="Receipt"
              fill
              unoptimized
              className="object-cover rounded-xl"
            />
          ) : (
            <Receipt className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        {expense.receiptUrl && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => viewFile(expense.receiptUrl!)}
              aria-label="View receipt"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() =>
                downloadFile(
                  expense.receiptUrl!,
                  expense.receiptFileName || "receipt",
                )
              }
              aria-label="Download receipt"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              status === "PENDING" &&
                "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
              status === "APPROVED" &&
                "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
              status === "REJECTED" &&
                "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
              status === "PAID" &&
                "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
            )}
          >
            {status === "PENDING"
              ? "Pending Review"
              : status === "APPROVED"
                ? "Approved"
                : status === "PAID"
                  ? "Paid"
                  : "Rejected"}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
            #EXP-{new Date(expense.expenseDate).getFullYear()}-
            {expense.id.toString().padStart(3, "0")}
          </span>
        </div>
        <h4 className="font-semibold text-sm text-foreground mb-0.5 truncate">
          {expense.merchant || expense.description || "Expense Claim"}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2.5">
          {expense.description || "-"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5">
            <AvatarImage src={resolveImageUrl(expense.user?.image)} />
            <AvatarFallback className="text-[9px] bg-muted">
              {expense.user?.firstName?.[0]}
              {expense.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground text-xs">
            {currentUserId && expense.userId === currentUserId
              ? "Created by Me"
              : [expense.user?.firstName, expense.user?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                expense.user?.email ||
                "Employee"}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-muted-foreground text-xs">
            {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
          </span>
        </div>
      </div>

      <div className="text-right min-w-[130px] flex-shrink-0 hidden lg:block">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Category
        </p>
        <div className="flex items-center gap-1.5 justify-end">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center",
              catConfig.bg,
            )}
          >
            <CatIcon className={cn("h-3.5 w-3.5", catConfig.text)} />
          </div>
          <span className="text-xs font-medium text-foreground">
            {adminCatLabel}
          </span>
        </div>
        {expense.description && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate max-w-[130px]">
            {expense.description}
          </p>
        )}
      </div>

      <div className="text-right min-w-[160px] flex-shrink-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
          Amount
        </p>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatINR(expense.amount)}
        </p>
        <p className="text-[10px] text-muted-foreground mb-3">INR</p>

        {isRejecting ? (
          <div className="space-y-2 text-left">
            <Input
              placeholder="Reason for rejection (required)..."
              value={rejectionReason}
              onChange={(e) => onRejectionReasonChange(e.target.value)}
              className="text-xs h-8"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onRejectCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1.5"
                disabled={!rejectionReason}
                onClick={() => onRejectConfirm(expense.id)}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        ) : status === "PENDING" ? (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30"
              onClick={() => onRejectStart(expense.id)}
            >
              Reject
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => onApprove(expense.id)}
              disabled={isPending}
            >
              Approve
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface MemberExpenseItemProps {
  expense: ExpenseWithRelations;
  onEdit: (expense: ExpenseToEdit) => void;
  onResubmit: (expense: ExpenseWithRelations) => void;
}

export function MemberExpenseItem({
  expense,
  onEdit,
  onResubmit,
}: MemberExpenseItemProps) {
  const status = expense.status || "PENDING";
  const catConfig = getCategoryConfig(expense.category || "Other");
  const CatIcon = catConfig.icon;
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const canEdit = status === "PENDING";
  const canResubmit = status === "REJECTED";

  const toEditPayload = (): ExpenseToEdit => ({
    id: expense.id,
    category: expense.category || "",
    amount: expense.amount,
    description: expense.description,
    merchant: expense.merchant,
    paymentMethod: expense.paymentMethod,
    expenseDate: expense.expenseDate,
    receiptUrl: expense.receiptUrl,
    receiptFileName: expense.receiptFileName,
  });

  return (
    <TableRow className="hover:bg-muted/30 transition-colors duration-200">
      <TableCell
        className={cn(
          "px-6 py-4 text-xs font-semibold tabular-nums border-l-4",
          status === "PENDING" && "border-l-amber-400",
          status === "APPROVED" && "border-l-emerald-400",
          status === "REJECTED" && "border-l-rose-400",
          status === "PAID" && "border-l-slate-400",
        )}
      >
        #EXP-{new Date(expense.expenseDate).getFullYear()}-
        {expense.id.toString().padStart(3, "0")}
      </TableCell>
      <TableCell className="px-6 py-4 text-xs text-muted-foreground">
        {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
      </TableCell>
      <TableCell className="px-6 py-4">
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
      </TableCell>
      <TableCell className="px-6 py-4 text-xs text-foreground max-w-[200px] truncate">
        {expense.description || expense.merchant || "-"}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm font-bold tabular-nums text-foreground">
        {formatINR(expense.amount)}
      </TableCell>
      <TableCell className="px-6 py-4">
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
          {STATUS_LABELS[status] || status}
        </span>
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        {canResubmit ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
            onClick={() => onResubmit(expense)}
          >
            Resubmit
          </Button>
        ) : canEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:text-blue-600/80 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            onClick={() => onEdit(toEditPayload())}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (expense.receiptUrl) {
                viewFile(expense.receiptUrl);
              } else {
                onEdit(toEditPayload());
              }
            }}
            aria-label="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
