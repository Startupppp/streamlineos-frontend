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
    className: "bg-muted text-muted-foreground border border-border",
  },
  DRAFT: {
    label: "Draft",
    className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  PREVIEW_READY: {
    label: "Preview Ready",
    className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  EXCEPTIONS_FOUND: {
    label: "Exceptions",
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  LOCKED: {
    label: "Locked",
    className: "bg-muted text-muted-foreground border border-border",
    icon: true,
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  PAYSLIPS_PUBLISHED: {
    label: "Published",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border border-border",
  },
  REOPENED: {
    label: "Reopened",
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
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
