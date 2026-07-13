"use client";

import { cn } from "@/lib/utils";
import type { ComponentType } from "@/types/payroll/setup";

const TYPE_CONFIG: Record<ComponentType, { label: string; className: string }> = {
  EARNING: {
    label: "Earning",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  DEDUCTION: {
    label: "Deduction",
    className: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  },
  EMPLOYER_CONTRIBUTION: {
    label: "Employer",
    className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  REIMBURSEMENT: {
    label: "Reimb.",
    className: "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  },
  TAX: {
    label: "Tax",
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    className: "bg-muted text-muted-foreground border border-border",
  },
};

type ComponentTypeBadgeProps = {
  type: ComponentType;
  className?: string;
};

export function ComponentTypeBadge({ type, className }: ComponentTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
