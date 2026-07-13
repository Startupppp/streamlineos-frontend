"use client";

import { cn } from "@/lib/utils";
import type { ReimbursementStatus, LoanStatus } from "@/types/payroll/ess";

type EssStatusVariant = ReimbursementStatus | LoanStatus | "OPEN" | "CLOSED" | "LOCKED" | "OLD" | "NEW" | "DRAFT" | "APPROVED" | "ACTIVE" | "PENDING" | "REJECTED" | "PAID";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  ACTIVE: { label: "Active", className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  CLOSED: { label: "Closed", className: "bg-muted text-muted-foreground border border-border" },
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground border border-border" },
  OPEN: { label: "Open", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  LOCKED: { label: "Locked", className: "bg-muted text-muted-foreground border border-border" },
  OLD: { label: "Old Regime", className: "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30" },
  NEW: { label: "New Regime", className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  SUBMITTED: { label: "Submitted", className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
};

interface EssStatusBadgeProps {
  status: EssStatusVariant | string;
  className?: string;
}

export function EssStatusBadge({ status, className }: EssStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border border-border" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
