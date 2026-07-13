"use client";

import { cn } from "@/lib/utils";

type PolicyStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
type ComponentStatus = "active" | "inactive";
type RunStatus = "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

const policyStatusConfig: Record<PolicyStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  ACTIVE: { label: "Active", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  SUPERSEDED: { label: "Superseded", className: "bg-muted text-muted-foreground border border-border" },
  ARCHIVED: { label: "Archived", className: "bg-muted text-muted-foreground border border-border" },
};

const componentStatusConfig: Record<ComponentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border border-border" },
};

const runStatusConfig: Record<RunStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  PROCESSING: { label: "Processing", className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  FAILED: { label: "Failed", className: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground border border-border" },
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
