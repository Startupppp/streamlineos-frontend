"use client";

import { cn } from "@/lib/utils";
import type { LoanStatus } from "@/hooks/api/payroll/loans-admin";

const STATUS_CONFIG: Record<LoanStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  REPAID: {
    label: "Repaid",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border border-red-200",
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
