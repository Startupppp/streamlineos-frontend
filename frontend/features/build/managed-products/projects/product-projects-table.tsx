"use client";

import { useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Map, RefreshCw, Unlink } from "lucide-react";
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
import type { DataTableColumn } from "@/components/ui/data-table";
import type { LinkedProjectRow } from "./use-product-projects-page";

export const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export const HEALTH_OPTIONS = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
];

export const ALL_SENTINEL = "all";

export const CONTRIB_OPTIONS = [
  { value: "none", label: "No tickets" },
  { value: "low", label: "Low (1–30%)" },
  { value: "medium", label: "Medium (31–70%)" },
  { value: "high", label: "High (71–100%)" },
];

function ContributionCell({ row }: { row: LinkedProjectRow }) {
  const { percent, totalTickets } = row.contribution;
  if (totalTickets === 0) {
    return <span className="text-xs text-muted-foreground">No tickets</span>;
  }
  const pct = percent !== null ? Math.round(percent) : 0;
  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{pct}%</span>
        <span className="font-mono tabular-nums text-muted-foreground/70">
          {row.contribution.doneTickets}/{totalTickets}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" aria-label={`${row.name} contribution`} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const display = projectStatusDisplayLabels[status] ?? status;
  const color = getColorSafe(projectStatusColors, status);
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium", color)}
    >
      <StatusDot status={status} />
      {display}
    </Badge>
  );
}

function HealthBadge({ health }: { health: string | null }) {
  if (!health) return <span className="text-xs text-muted-foreground">—</span>;
  const dotColor = getColorSafe(healthDotColors, health);
  const badgeColor = getColorSafe(healthStatusColors, health);
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium", badgeColor)}
    >
      <span
        className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotColor)}
        aria-hidden="true"
      />
      {projectHealthLabel(health)}
    </Badge>
  );
}

function NextMilestoneCell({ row }: { row: LinkedProjectRow }) {
  if (!row.nextMilestone) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const { name, targetDate } = row.nextMilestone;
  const tone = resolveTargetDate(targetDate, "ACTIVE");
  return (
    <div className="flex flex-col gap-0.5">
      <span className="max-w-[140px] truncate text-xs font-medium">{name}</span>
      {tone ? (
        <span className={cn("flex items-center gap-1 text-xs", dateToneClasses[tone.tone])}>
          <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
          {tone.label}
        </span>
      ) : null}
    </div>
  );
}

function NextReleaseCell({ row }: { row: LinkedProjectRow }) {
  if (!row.nextRelease) return <span className="text-xs text-muted-foreground">—</span>;
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

function LinkedGoalsCell({ row }: { row: LinkedProjectRow }) {
  if (!row.linkedGoals.length) return <span className="text-xs text-muted-foreground">—</span>;
  const first = row.linkedGoals[0];
  return (
    <div className="flex flex-col gap-0.5">
      <span className="max-w-[160px] truncate text-xs font-medium">{first.title}</span>
      {row.linkedGoals.length > 1 ? (
        <span className="text-xs text-muted-foreground">+{row.linkedGoals.length - 1} more</span>
      ) : null}
    </div>
  );
}

interface ProductProjectMobileCardProps {
  row: LinkedProjectRow;
  onUnlink: (row: LinkedProjectRow) => void;
}

export function ProductProjectMobileCard({
  row,
  onUnlink,
}: ProductProjectMobileCardProps) {
  const canUnlink = row.allowedActions.includes("unlink");
  const handleUnlinkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUnlink(row);
    },
    [onUnlink, row],
  );
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="font-mono tabular-nums text-xs text-muted-foreground">{row.key}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <ContributionCell row={row} />
      {row.nextMilestone ? (
        <p className="text-xs text-muted-foreground truncate">{row.nextMilestone.name}</p>
      ) : null}
      {canUnlink ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={handleUnlinkClick}
        >
          <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
          Unlink from product
        </Button>
      ) : null}
    </div>
  );
}

interface BuildProductProjectsColumnsProps {
  onUnlinkClick: (row: LinkedProjectRow) => void;
}

export function buildProductProjectsColumns({
  onUnlinkClick,
}: BuildProductProjectsColumnsProps): DataTableColumn<LinkedProjectRow>[] {
  return [
    {
      key: "name",
      header: "Project",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="max-w-[200px] truncate font-medium text-sm">{row.name}</span>
          <span className="font-mono tabular-nums text-xs text-muted-foreground">{row.key}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "health",
      header: "Health",
      cell: (row) => <HealthBadge health={row.health} />,
    },
    {
      key: "nextMilestone",
      header: "Next milestone",
      cell: (row) => <NextMilestoneCell row={row} />,
    },
    {
      key: "nextRelease",
      header: "Next release",
      cell: (row) => <NextReleaseCell row={row} />,
    },
    {
      key: "linkedGoals",
      header: "Linked goals",
      cell: (row) => <LinkedGoalsCell row={row} />,
    },
    {
      key: "contribution",
      header: "Contribution",
      cell: (row) => <ContributionCell row={row} />,
    },
    {
      key: "dates",
      header: "Dates",
      cell: (row) => {
        const start = row.startDate ? format(new Date(row.startDate), "MMM d, yyyy") : null;
        const end = row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : null;
        if (!start && !end) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {start ? <span>From {start}</span> : null}
            {end ? <span>To {end}</span> : null}
          </div>
        );
      },
    },
    {
      key: "roadmapItems",
      header: "Roadmap items",
      cell: (row) =>
        row.linkedRoadmapItemCount > 0 ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Map className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-mono tabular-nums">{row.linkedRoadmapItemCount}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "sourceFreshness",
      header: "Data freshness",
      cell: (row) =>
        row.sourceFreshness ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground" title={row.sourceFreshness}>
            <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
            {formatDistanceToNow(new Date(row.sourceFreshness), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: LinkedProjectRow) =>
        row.allowedActions.includes("unlink") ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Unlink ${row.name} from product`}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onUnlinkClick(row);
            }}
          >
            <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
            Unlink
          </Button>
        ) : null,
    },
  ];
}
