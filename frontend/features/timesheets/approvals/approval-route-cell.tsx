"use client";

import { format, isBefore, parseISO } from "date-fns";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { TimesheetPeriod } from "@/features/timesheets/types";
import { timesheetRouteRungLabel } from "@/features/timesheets/approval-route-summary";

interface ApprovalRouteCellProps {
  period: Pick<TimesheetPeriod, "status" | "approvalRoute" | "approvalDueAt" | "approvalEscalatedAt">;
  now?: Date;
  detailed?: boolean;
}

export function approvalDueLabel(
  period: Pick<TimesheetPeriod, "status" | "approvalDueAt">,
  now: Date,
): { text: string; overdue: boolean } | null {
  if (period.status !== "SUBMITTED" || !period.approvalDueAt) return null;
  const due = parseISO(period.approvalDueAt);
  const overdue = isBefore(due, now);
  return { text: `${overdue ? "Overdue since" : "Due"} ${format(due, "MMM d, h:mm a")}`, overdue };
}

export function ApprovalRouteCell({ period, now = new Date(), detailed = false }: ApprovalRouteCellProps) {
  const route = period.approvalRoute;
  if (!route) return <span className="text-muted-foreground">—</span>;
  const due = approvalDueLabel(period, now);
  const danger = statusToneClasses("danger");
  return (
    <div className="min-w-0">
      <p className="text-dense font-medium">
        {timesheetRouteRungLabel(route)}
        {route.escalatedFrom ? <span className="ml-1 text-micro text-muted-foreground">escalated</span> : null}
      </p>
      {detailed ? <p className="text-xs leading-relaxed text-muted-foreground">{route.explanation}</p> : null}
      {due ? <p className={cn("text-micro", due.overdue ? danger.ink : "text-muted-foreground")}>{due.text}</p> : null}
    </div>
  );
}
