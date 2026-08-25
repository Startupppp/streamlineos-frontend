"use client";

import { cn } from "@/lib/utils";
import type { Incident } from "@/types/projects";
import { getSlaState } from "./sla";

function TimerRow({
  label,
  dueAt,
  metAt,
  breached,
}: {
  label: string;
  dueAt: string | null;
  metAt: string | null;
  breached: boolean;
}) {
  if (!dueAt) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <span className="text-dense font-medium text-muted-foreground">{label}</span>
        <span className="text-dense text-muted-foreground">No SLA set</span>
      </div>
    );
  }

  const dueDate = new Date(dueAt);
  const dueLabel = dueDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  if (metAt) {
    const metDate = new Date(metAt);
    const metLabel = metDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <span className="text-dense font-medium text-muted-foreground">{label}</span>
        <div className="text-right">
          <p className="text-dense text-status-success-ink font-medium">Met — {metLabel}</p>
          <p className="text-micro text-muted-foreground">Due {dueLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className={cn("text-dense font-medium", breached ? "text-status-danger-ink" : "text-muted-foreground")}>
        {label}
      </span>
      <div className="text-right">
        <p className={cn("text-dense font-medium", breached ? "text-status-danger-ink" : "text-foreground")}>
          {breached ? "Breached" : "Pending"} — due {dueLabel}
        </p>
      </div>
    </div>
  );
}

interface IncidentSlaPanelProps {
  incident: Incident;
}

export function IncidentSlaPanel({ incident }: IncidentSlaPanelProps) {
  const { responseBreached, resolutionBreached } = getSlaState(incident);

  const isBreached = responseBreached || resolutionBreached;

  return (
    <div className={cn(
      "rounded-xl border bg-card px-4 py-3",
      isBreached ? "border-status-danger-rule bg-status-danger-surface" : "border-border",
    )}>
      <p className={cn(
        "text-micro font-semibold uppercase tracking-wider mb-2",
        isBreached ? "text-status-danger-ink" : "text-muted-foreground",
      )}>
        SLA Status
      </p>
      <TimerRow
        label="Response"
        dueAt={incident.responseDueAt}
        metAt={incident.respondedAt}
        breached={responseBreached}
      />
      <TimerRow
        label="Resolution"
        dueAt={incident.resolutionDueAt}
        metAt={incident.resolvedAt}
        breached={resolutionBreached}
      />
    </div>
  );
}
