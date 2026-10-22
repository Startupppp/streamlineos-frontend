"use client";

import { type MouseEvent } from "react";
import { format } from "date-fns";
import { Calendar, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getColorSafe,
  healthDotColors,
  healthStatusColors,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { projectHealthLabel } from "@/lib/project-health";
import {
  resolveTargetDate,
  dateToneClasses,
  StatusDot,
} from "@/features/build/project-list/project-table-actions";
import type { LinkedProjectRow } from "./use-product-projects-page";

export function ContributionCell({ row }: { row: LinkedProjectRow }) {
  const { percent, totalTickets } = row.contribution;
  if (totalTickets === 0) {
    return <span className="text-xs text-muted-foreground">No tickets</span>;
  }
  const pct = percent !== null ? Math.round(percent) : 0;
  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{pct}%</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {row.contribution.doneTickets}/{totalTickets}
        </span>
      </div>
      <Progress
        value={pct}
        className="h-1.5"
        aria-label={`${row.name} contribution`}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const display = projectStatusDisplayLabels[status] ?? status;
  const color = getColorSafe(projectStatusColors, status);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium",
        color,
      )}
    >
      <StatusDot status={status} />
      {display}
    </Badge>
  );
}

export function HealthBadge({ health }: { health: string | null }) {
  if (!health) return <span className="text-xs text-muted-foreground">—</span>;
  const dotColor = getColorSafe(healthDotColors, health);
  const badgeColor = getColorSafe(healthStatusColors, health);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium",
        badgeColor,
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
          dotColor,
        )}
        aria-hidden="true"
      />
      {projectHealthLabel(health)}
    </Badge>
  );
}

export function NextMilestoneCell({ row }: { row: LinkedProjectRow }) {
  if (!row.nextMilestone) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const { name, targetDate } = row.nextMilestone;
  const tone = resolveTargetDate(targetDate, "ACTIVE");
  return (
    <div className="flex flex-col gap-0.5">
      <span className="max-w-[140px] truncate text-xs font-medium">{name}</span>
      {tone ? (
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            dateToneClasses[tone.tone],
          )}
        >
          <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
          {tone.label}
        </span>
      ) : null}
    </div>
  );
}

export function NextReleaseCell({ row }: { row: LinkedProjectRow }) {
  if (!row.nextRelease)
    return <span className="text-xs text-muted-foreground">—</span>;
  const { name, version, releaseDate } = row.nextRelease;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="max-w-[140px] truncate text-xs font-medium">{name}</span>
      <span className="font-mono tabular-nums text-xs text-muted-foreground">
        {version}
        {releaseDate ? ` · ${format(new Date(releaseDate), "MMM d")}` : ""}
      </span>
    </div>
  );
}

export function LinkedGoalsCell({ row }: { row: LinkedProjectRow }) {
  if (!row.linkedGoals.length)
    return <span className="text-xs text-muted-foreground">—</span>;
  const first = row.linkedGoals[0];
  return (
    <div className="flex flex-col gap-0.5">
      <span className="max-w-[160px] truncate text-xs font-medium">
        {first.title}
      </span>
      {row.linkedGoals.length > 1 ? (
        <span className="text-xs text-muted-foreground">
          +{row.linkedGoals.length - 1} more
        </span>
      ) : null}
    </div>
  );
}

export function PrimaryBadge() {
  return (
    <Badge variant="secondary" className="text-micro" title="This product is the project's primary product">
      Primary
    </Badge>
  );
}

interface ProjectRowActionsProps {
  row: LinkedProjectRow;
  onUnlinkClick: (row: LinkedProjectRow) => void;
  onSetPrimaryClick: (row: LinkedProjectRow) => void;
}

export function ProjectRowActions({ row, onUnlinkClick, onSetPrimaryClick }: ProjectRowActionsProps) {
  function handleSetPrimary(e: MouseEvent) {
    e.stopPropagation();
    onSetPrimaryClick(row);
  }
  function handleUnlink(e: MouseEvent) {
    e.stopPropagation();
    onUnlinkClick(row);
  }
  return (
    <div className="flex items-center justify-end gap-1">
      {row.allowedActions.includes("setPrimary") ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Make this the primary product for ${row.name}`}
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={handleSetPrimary}
        >
          Set primary
        </Button>
      ) : null}
      {row.allowedActions.includes("unlink") ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Unlink ${row.name} from product`}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={handleUnlink}
        >
          <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
          Unlink
        </Button>
      ) : null}
    </div>
  );
}
