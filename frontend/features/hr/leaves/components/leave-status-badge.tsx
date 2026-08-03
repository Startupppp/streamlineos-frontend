"use client";

import React from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const leaveStatusConfig: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
    icon: XCircle,
  },
};

export function LeaveStatusBadge({ status }: { status: string }) {
  const c = leaveStatusConfig[status] ?? leaveStatusConfig.PENDING;
  const Icon = c!.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
        c!.className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {c!.label}
    </span>
  );
}
