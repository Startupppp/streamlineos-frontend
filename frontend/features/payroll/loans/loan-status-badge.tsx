"use client";

import { cn } from "@/lib/utils";
import type { LoanStatus } from "@/hooks/api/payroll/loans-admin";

const STATUS_CONFIG: Record<LoanStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  REPAID: {
    label: "Repaid",
    className: "bg-muted text-muted-foreground border border-border",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  },
};

interface LoanStatusBadgeProps {
  status: LoanStatus;
  className?: string;
}

export function LoanStatusBadge({ status, className }: LoanStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
