"use client";

import { cn } from "@/lib/utils";

type PolicyStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
type ComponentStatus = "active" | "inactive";
type RunStatus = "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

const policyStatusConfig: Record<PolicyStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  ACTIVE: { label: "Active", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  SUPERSEDED: { label: "Superseded", className: "bg-slate-100 text-slate-600 border border-slate-200" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-500 border border-slate-200" },
};

const componentStatusConfig: Record<ComponentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  inactive: { label: "Inactive", className: "bg-slate-100 text-slate-500 border border-slate-200" },
};

const runStatusConfig: Record<RunStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  PROCESSING: { label: "Processing", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  FAILED: { label: "Failed", className: "bg-red-50 text-red-700 border border-red-200" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500 border border-slate-200" },
};

type PayrollStatusBadgeProps =
  | { variant: "policy"; status: PolicyStatus; className?: string }
  | { variant: "component"; status: ComponentStatus; className?: string }
  | { variant: "run"; status: RunStatus; className?: string };

export function PayrollStatusBadge(props: PayrollStatusBadgeProps) {
  let config: { label: string; className: string };

  if (props.variant === "policy") {
    config = policyStatusConfig[props.status];
  } else if (props.variant === "component") {
    config = componentStatusConfig[props.status];
  } else {
    config = runStatusConfig[props.status];
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        config.className,
        props.className,
      )}
    >
      {config.label}
    </span>
  );
}
