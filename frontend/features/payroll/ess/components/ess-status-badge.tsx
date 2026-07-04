"use client";

import { cn } from "@/lib/utils";
import type { ReimbursementStatus, LoanStatus } from "@/types/payroll/ess";

type EssStatusVariant = ReimbursementStatus | LoanStatus | "OPEN" | "CLOSED" | "LOCKED" | "OLD" | "NEW" | "DRAFT" | "APPROVED" | "ACTIVE" | "PENDING" | "REJECTED" | "PAID";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-700 border border-red-200" },
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  ACTIVE: { label: "Active", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  CLOSED: { label: "Closed", className: "bg-slate-100 text-slate-600 border border-slate-200" },
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600 border border-slate-200" },
  OPEN: { label: "Open", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  LOCKED: { label: "Locked", className: "bg-slate-100 text-slate-600 border border-slate-200" },
  OLD: { label: "Old Regime", className: "bg-violet-50 text-violet-700 border border-violet-200" },
  NEW: { label: "New Regime", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  SUBMITTED: { label: "Submitted", className: "bg-blue-50 text-blue-700 border border-blue-200" },
};

interface EssStatusBadgeProps {
  status: EssStatusVariant | string;
  className?: string;
}

export function EssStatusBadge({ status, className }: EssStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border border-slate-200" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
