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
  DRAFT: "bg-blue-50 text-blue-700 border-blue-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  VOID: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  POSTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REIMBURSEMENT_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  REIMBURSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  CLOSING: "bg-amber-50 text-amber-700 border-amber-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
  LOCKED: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPLIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
