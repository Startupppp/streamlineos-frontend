"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { cn } from "@/lib/utils";
import type { ApprovalRoute, ApprovalRung } from "@/hooks/api/hr/approval-route-schema";

const RUNG_LABELS: Record<ApprovalRung, string> = {
  reporting_manager: "Reporting manager",
  managers_manager: "Manager's manager",
  department_head: "Department head",
  queue: "Queue",
};

interface ApprovalRoutePanelProps {
  route: ApprovalRoute | undefined;
  isLoading: boolean;
  error: unknown;
  className?: string;
}

export function ApprovalRoutePanel({ route, isLoading, error, className }: ApprovalRoutePanelProps) {
  const warning = statusToneClasses("warning");
  const danger = statusToneClasses("danger");

  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 px-3 py-2.5", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Approver</p>
      {isLoading ? (
        <div className="mt-2 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      ) : error ? (
        <p className={cn("mt-1 text-xs leading-relaxed", danger.ink)}>
          Couldn&apos;t work out who approves this request. {getErrorMessage(error)}
        </p>
      ) : !route ? null : route.rung === null ? (
        <p className={cn("mt-1 text-xs leading-relaxed", warning.ink)}>
          {route.explanation} Ask an HR administrator to set a reporting manager before submitting.
        </p>
      ) : (
        <div className="mt-1 space-y-1">
          <p className="text-sm text-foreground">
            {route.approver ? (
              <>
                {getUserDisplayName(route.approver)}
                {route.approver.designation ? (
                  <span className="ml-1 text-xs text-muted-foreground">{route.approver.designation}</span>
                ) : null}
              </>
            ) : route.queue ? (
              <>
                {route.queue.label}
                <span className="ml-1 text-xs text-muted-foreground">
                  {route.queue.memberCount} {route.queue.memberCount === 1 ? "approver" : "approvers"}
                </span>
              </>
            ) : (
              RUNG_LABELS[route.rung]
            )}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{route.explanation}</p>
          <p className="text-xs text-muted-foreground">
            {RUNG_LABELS[route.rung]} · expected within {route.slaHours}h
            {route.escalation ? ` · escalates to ${RUNG_LABELS[route.escalation.rung].toLowerCase()}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
