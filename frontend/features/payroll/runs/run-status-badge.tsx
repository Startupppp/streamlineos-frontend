"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PayrollRunStatus } from "@/types/payroll/runs";

const STATUS_CONFIG: Record<
  PayrollRunStatus,
  { label: string; className: string; icon?: boolean }
> = {
  PREPARING: {
    label: "Preparing",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  DRAFT: {
    label: "Draft",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  PREVIEW_READY: {
    label: "Preview Ready",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  EXCEPTIONS_FOUND: {
    label: "Exceptions",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  LOCKED: {
    label: "Locked",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: true,
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  PAYSLIPS_PUBLISHED: {
    label: "Published",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-slate-100 text-slate-500 border border-slate-200",
  },
  REOPENED: {
    label: "Reopened",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
};

interface RunStatusBadgeProps {
  status: PayrollRunStatus;
  className?: string;
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
        config.className,
        className,
      )}
    >
      {config.icon && <Lock className="h-2.5 w-2.5" />}
      {config.label}
    </span>
  );
}
