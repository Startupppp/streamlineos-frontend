"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type BillStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export type JournalStatus = "DRAFT" | "PENDING_APPROVAL" | "POSTED" | "VOID";

export type ExpenseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REIMBURSEMENT_PENDING"
  | "REIMBURSED"
  | "REJECTED";

export type PeriodStatus = "OPEN" | "CLOSING" | "CLOSED" | "LOCKED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type CreditStatus = "DRAFT" | "POSTED" | "APPLIED" | "VOID";

export type FinanceStatus =
  | InvoiceStatus
  | BillStatus
  | JournalStatus
  | ExpenseStatus
  | PeriodStatus
  | ApprovalStatus
  | CreditStatus;

const STATUS_CLASSES: Record<FinanceStatus, string> = {
  DRAFT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  SENT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  OVERDUE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  VOID: "bg-muted text-muted-foreground border-border",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  POSTED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REIMBURSEMENT_PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  REIMBURSED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  OPEN: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  CLOSING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
  LOCKED: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  APPLIED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

const STATUS_LABELS: Record<FinanceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
  PENDING_APPROVAL: "Pending",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REIMBURSEMENT_PENDING: "Reimb. Pending",
  REIMBURSED: "Reimbursed",
  REJECTED: "Rejected",
  OPEN: "Open",
  CLOSING: "Closing",
  CLOSED: "Closed",
  LOCKED: "Locked",
  PENDING: "Pending",
  APPLIED: "Applied",
};

type BadgeSize = "row" | "chip";

type FinanceStatusBadgeProps = {
  status: FinanceStatus;
  size?: BadgeSize;
  className?: string;
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  row: "text-[9px] px-1.5 py-0 h-4",
  chip: "text-xs px-2 py-0.5",
};

export function FinanceStatusBadge({
  status,
  size = "row",
  className,
}: FinanceStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_CLASSES[status], SIZE_CLASSES[size], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
