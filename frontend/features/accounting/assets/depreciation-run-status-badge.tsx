"use client";

import { Badge } from "@/components/ui/badge";
import type { DepreciationRun } from "@/types/accounting/assets";

const RUN_STATUS_CLASSES: Record<DepreciationRun["status"], string> = {
  PENDING:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  COMPLETED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REVERSED: "bg-muted text-foreground border-border",
};

const RUN_STATUS_LABELS: Record<DepreciationRun["status"], string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  REVERSED: "Reversed",
};

interface RunStatusBadgeProps {
  status: DepreciationRun["status"];
}

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-micro px-1.5 py-0 h-4 ${RUN_STATUS_CLASSES[status]}`}
    >
      {RUN_STATUS_LABELS[status]}
    </Badge>
  );
}
