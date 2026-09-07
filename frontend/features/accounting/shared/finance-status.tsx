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
  DRAFT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  SENT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PARTIALLY_PAID: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  PAID: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  OVERDUE: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  VOID: "bg-muted text-muted-foreground border-border",
  PENDING_APPROVAL: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  POSTED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  APPROVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REIMBURSEMENT_PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  REIMBURSED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  OPEN: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  CLOSING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  CLOSED: "bg-muted text-muted-foreground border-border",
  LOCKED: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  APPLIED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
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
  status: string;
  size?: BadgeSize;
  className?: string;
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  row: "text-micro px-1.5 py-0 h-4",
  chip: "text-xs px-2 py-0.5",
};

function isFinanceStatus(status: string): status is FinanceStatus {
  return Object.prototype.hasOwnProperty.call(STATUS_CLASSES, status);
}

export function FinanceStatusBadge({
  status,
  size = "row",
  className,
}: FinanceStatusBadgeProps) {
  const known = isFinanceStatus(status);
  const toneClass = known ? STATUS_CLASSES[status] : "bg-muted text-muted-foreground border-border";
  const label = known ? STATUS_LABELS[status] : status;
  return (
    <Badge
      variant="outline"
      className={cn(toneClass, SIZE_CLASSES[size], className)}
    >
      {label}
    </Badge>
  );
}
