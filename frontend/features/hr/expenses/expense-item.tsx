"use client";

import { type ChangeEvent } from "react";
import { format } from "date-fns";
import {
  Receipt,
  Download,
  Eye,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatAmountInCurrency } from "@/lib/format-utils";
import { viewFile, downloadFile } from "@/hooks/common/use-file-url";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import {
  getCategoryConfig,
  ADMIN_CATEGORY_LABELS,
  parseExpenseReceipts,
  getReceiptFileKind,
  receiptKindIcon,
  receiptKindLabel,
} from "@/lib/expense-constants";
import { TruncatedText } from "@/components/ui/truncated-text";
import { activationProps } from "@/lib/keyboard-activation";

interface AdminExpenseItemProps {
  expense: ExpenseWithRelations;
  currentUserId?: string;
  rejectingId: number | null;
  rejectionReason: string;
  isPending: boolean;
  /** The row whose decision is in flight, so only its button shows busy. */
  pendingId: number | null;
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
  pendingId,
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
  const isRowPending = isPending && pendingId === expense.id;
  // The backend refuses a decision on your own claim (403), so do not offer one.
  const isOwnExpense = !!currentUserId && expense.userId === currentUserId;
  const adminCatLabel =
    ADMIN_CATEGORY_LABELS[expense.category || ""] || catConfig.label;
  const receipts = parseExpenseReceipts(expense.receiptUrl, expense.receiptFileName);
  const primaryReceipt = receipts[0];
  const receiptKind = primaryReceipt
    ? getReceiptFileKind(primaryReceipt.url, primaryReceipt.fileName)
    : null;
  const ReceiptKindIcon = receiptKindIcon(receiptKind ?? "file");
  const primaryImageSrc =
    primaryReceipt && receiptKind === "image"
      ? resolveImageUrl(primaryReceipt.url)
      : undefined;

  function handleViewReceiptArea() {
    if (primaryReceipt) viewFile(primaryReceipt.url);
  }
  function handleViewReceiptBtn() {
    if (primaryReceipt) viewFile(primaryReceipt.url);
  }
  function handleDownloadReceipt() {
    if (!primaryReceipt) return;
    downloadFile(primaryReceipt.url, primaryReceipt.fileName || "receipt");
  }
  function handleRejectionReasonChange(e: ChangeEvent<HTMLInputElement>) {
    onRejectionReasonChange(e.target.value);
  }
  function handleConfirmReject() {
    onRejectConfirm(expense.id);
  }
  function handleStartReject() {
    onRejectStart(expense.id);
  }
  function handleApproveExpense() {
    onApprove(expense.id);
  }

  return (
    <div
      className={cn(
        "flex items-start gap-4 px-4 py-4 hover:bg-muted/20 transition-colors duration-200 border-l-4",
        status === "PENDING" && "border-l-status-warning-rule",
        status === "APPROVED" && "border-l-status-success-rule",
        status === "REJECTED" && "border-l-status-danger-rule",
        status === "PAID" && "border-l-border",
      )}
    >
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
        <div
          className={cn(
            "relative w-[96px] h-[76px] rounded-xl bg-muted/60 flex items-center justify-center overflow-hidden border border-border",
            primaryReceipt &&
              "cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all duration-200",
          )}
          {...activationProps(handleViewReceiptArea, "View receipt")}
        >
          {primaryImageSrc ? (
            <Image
              src={primaryImageSrc}
              alt="Receipt"
              fill
              unoptimized
              className="object-cover rounded-xl"
            />
          ) : receiptKind ? (
            <div className="flex flex-col items-center justify-center gap-0.5 px-1">
              <ReceiptKindIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
              <span className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                {receiptKindLabel(receiptKind)}
              </span>
            </div>
          ) : (
            <Receipt className="h-6 w-6 text-muted-foreground" />
          )}
          {receipts.length > 1 && (
            <span className="absolute bottom-1 right-1 rounded-md bg-background/90 px-1.5 py-0.5 text-micro font-semibold text-foreground shadow-sm">
              +{receipts.length - 1}
            </span>
          )}
        </div>
        {primaryReceipt && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 text-muted-foreground hover:text-foreground"
              onClick={handleViewReceiptBtn}
              aria-label="View receipt"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 text-muted-foreground hover:text-foreground"
              onClick={handleDownloadReceipt}
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
              "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
              status === "PENDING" &&
                "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
              status === "APPROVED" &&
                "bg-status-success-surface text-status-success-ink border-status-success-rule",
              status === "REJECTED" &&
                "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
              status === "PAID" &&
                "bg-muted text-muted-foreground border-border",
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
          <span className="text-micro font-medium text-muted-foreground tabular-nums">
            #EXP-{new Date(expense.expenseDate).getFullYear()}-
            {expense.id.toString().padStart(3, "0")}
          </span>
        </div>
        <TruncatedText
          text={expense.merchant || expense.description || "Expense Claim"}
          className="font-semibold text-sm text-foreground mb-0.5"
        />
        <TruncatedText
          text={expense.description || "-"}
          className="text-xs text-muted-foreground mb-2.5"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5">
            <AvatarImage src={resolveImageUrl(expense.user?.image)} />
            <AvatarFallback className="text-micro bg-muted">
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
        <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
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
          <p className="text-dense text-muted-foreground mt-1 truncate max-w-[130px]">
            {expense.description}
          </p>
        )}
      </div>

      <div className="text-right min-w-[160px] flex-shrink-0">
        <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
          Amount
        </p>
        <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
          {formatAmountInCurrency(expense.amount, expense.currency)}
        </p>
        <p className="text-micro text-muted-foreground mb-3">
          {(expense.currency ?? "INR").toUpperCase()}
        </p>

        {isRejecting ? (
          <div className="space-y-2 text-left">
            <Input
              placeholder="Reason for rejection (required)..."
              value={rejectionReason}
              onChange={handleRejectionReasonChange}
              className="text-xs"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={onRejectCancel}
              >
                Cancel
              </Button>
              <LoadingButton
                size="sm"
                variant="destructive"
                className="text-xs gap-1.5"
                disabled={!rejectionReason.trim() || isPending}
                isPending={isRowPending}
                onClick={handleConfirmReject}
              >
                Confirm reject
              </LoadingButton>
            </div>
          </div>
        ) : status === "PENDING" && !isOwnExpense ? (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleStartReject}
              disabled={isPending}
            >
              Reject
            </Button>
            <LoadingButton
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleApproveExpense}
              disabled={isPending}
              isPending={isRowPending}
            >
              Approve
            </LoadingButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
