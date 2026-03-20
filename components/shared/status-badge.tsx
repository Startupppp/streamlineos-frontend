"use client";

import { cn } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  // positive
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  won: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  // warning
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  draft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  open: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  triage: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  // danger
  inactive: "bg-red-500/10 text-red-700 dark:text-red-400",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  lost: "bg-red-500/10 text-red-700 dark:text-red-400",
  overdue: "bg-red-500/10 text-red-700 dark:text-red-400",
  // info
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  started: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  planning: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_review: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  // neutral
  deactivated: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  closed: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  archived: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  on_hold: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const FALLBACK_COLOR = "bg-slate-500/10 text-slate-600 dark:text-slate-400";

function getStatusColor(status: string): string {
  const key = status.toLowerCase().replace(/[\s-]/g, "_");
  return statusColorMap[key] ?? FALLBACK_COLOR;
}

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "dot" | "outline";
  label?: string;
  className?: string;
}

export function StatusBadge({
  status,
  variant = "default",
  label,
  className,
}: StatusBadgeProps) {
  const color = getStatusColor(status);
  const displayLabel = label ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (variant === "dot") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", color.replace(/\/10/g, "").split(" ")[0])} />
        {displayLabel}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "outline" ? "border" : "",
        color,
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
