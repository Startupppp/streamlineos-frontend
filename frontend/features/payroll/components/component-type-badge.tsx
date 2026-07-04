"use client";

import { cn } from "@/lib/utils";
import type { ComponentType } from "@/types/payroll/setup";

const TYPE_CONFIG: Record<ComponentType, { label: string; className: string }> = {
  EARNING: {
    label: "Earning",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  DEDUCTION: {
    label: "Deduction",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  EMPLOYER_CONTRIBUTION: {
    label: "Employer",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  REIMBURSEMENT: {
    label: "Reimb.",
    className: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  },
  TAX: {
    label: "Tax",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
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
