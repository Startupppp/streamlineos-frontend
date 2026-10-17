"use client";

import { Calendar, Ticket } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getColorSafe,
  healthDotColors,
  healthStatusColors,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import type { ProjectListItem } from "@/types/projects/projects";
import { projectHealthLabel } from "@/lib/project-health";
import {
  StatusDot,
  resolveTargetDate,
  dateToneClasses,
} from "./project-table-actions";

export function ProjectStatusCell({ p }: { p: ProjectListItem }) {
  const status = p.status ?? "ACTIVE";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium",
        statusColor,
      )}
    >
      <StatusDot status={status} />
      {displayLabel}
    </Badge>
  );
}

export function ProjectHealthCell({ p }: { p: ProjectListItem }) {
  const dotColor = getColorSafe(healthDotColors, p.health);
  const badgeColor = getColorSafe(healthStatusColors, p.health);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium",
        badgeColor,
      )}
    >
      <span
        className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotColor)}
        aria-hidden="true"
      />
      {projectHealthLabel(p.health)}
    </Badge>
  );
}

export function ProjectTargetDateCell({ p }: { p: ProjectListItem }) {
  const status = p.status ?? "ACTIVE";
  const targetDate = resolveTargetDate(p.endDate, status);
  if (!targetDate) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        dateToneClasses[targetDate.tone],
      )}
    >
      <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
      {targetDate.label}
    </div>
  );
}

export function ProjectStartDateCell({ p }: { p: ProjectListItem }) {
  if (!p.startDate) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="text-xs text-muted-foreground">
      {format(new Date(p.startDate), "MMM d")}
    </span>
  );
}

export function ProjectIssueCountCell({ p }: { p: ProjectListItem }) {
  return (
    <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
      <Ticket className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{p.progress.total}</span>
    </div>
  );
}

export function ProjectProgressCell({ p }: { p: ProjectListItem }) {
  const progressValue =
    p.progress.total > 0 ? Math.round(p.progress.percentage) : 0;
  if (p.progress.total === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Progress
        value={progressValue}
        aria-label={`${p.name} progress`}
        valueLabel={`${progressValue}%`}
        className="h-1.5 min-w-0 flex-1"
      />
      <span
        aria-hidden="true"
        className="w-8 shrink-0 text-right font-mono text-micro tabular-nums text-muted-foreground"
      >
        {progressValue}%
      </span>
    </div>
  );
}
