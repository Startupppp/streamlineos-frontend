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
      "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className:
      "bg-status-success-surface text-status-success-ink border-status-success-rule",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    className:
      "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
    icon: XCircle,
  },
};

const LEAVE_STATUS_FALLBACK = {
  label: "Pending",
  className:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  icon: Clock,
};

export function LeaveStatusBadge({ status }: { status: string }) {
  const c = leaveStatusConfig[status] ?? LEAVE_STATUS_FALLBACK;
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
        c.className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {c.label}
    </span>
  );
}
