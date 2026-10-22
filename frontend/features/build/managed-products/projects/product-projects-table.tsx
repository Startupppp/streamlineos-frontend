"use client";

import { type MouseEvent } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Map, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { LinkedProjectRow } from "./use-product-projects-page";
import {
  ContributionCell,
  StatusBadge,
  HealthBadge,
  NextMilestoneCell,
  NextReleaseCell,
  LinkedGoalsCell,
  PrimaryBadge,
  ProjectRowActions,
} from "./product-projects-table-cells";

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

interface ProductProjectMobileCardProps {
  row: LinkedProjectRow;
  onUnlink: (row: LinkedProjectRow) => void;
}

export function ProductProjectMobileCard({
  row,
  onUnlink,
}: ProductProjectMobileCardProps) {
  const canUnlink = row.allowedActions.includes("unlink");
  function handleUnlinkClick(e: MouseEvent) {
    e.stopPropagation();
    onUnlink(row);
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{row.name}</span>
            {row.isPrimary ? <PrimaryBadge /> : null}
          </p>
          <p className="font-mono tabular-nums text-xs text-muted-foreground">
            {row.key}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <ContributionCell row={row} />
      {row.nextMilestone ? (
        <p className="text-xs text-muted-foreground truncate">
          {row.nextMilestone.name}
        </p>
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
  onSetPrimaryClick: (row: LinkedProjectRow) => void;
}

export function buildProductProjectsColumns({
  onUnlinkClick,
  onSetPrimaryClick,
}: BuildProductProjectsColumnsProps): DataTableColumn<LinkedProjectRow>[] {
  return [
    {
      key: "name",
      header: "Project",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="max-w-[200px] truncate font-medium text-sm">
              {row.name}
            </span>
            {row.isPrimary ? <PrimaryBadge /> : null}
          </span>
          <span className="font-mono tabular-nums text-xs text-muted-foreground">
            {row.key}
          </span>
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
        const start = row.startDate
          ? format(new Date(row.startDate), "MMM d, yyyy")
          : null;
        const end = row.endDate
          ? format(new Date(row.endDate), "MMM d, yyyy")
          : null;
        if (!start && !end)
          return <span className="text-xs text-muted-foreground">—</span>;
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
            <span className="font-mono tabular-nums">
              {row.linkedRoadmapItemCount}
            </span>
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
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={row.sourceFreshness}
          >
            <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
            {formatDistanceToNow(new Date(row.sourceFreshness), {
              addSuffix: true,
            })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: LinkedProjectRow) => (
        <ProjectRowActions
          row={row}
          onUnlinkClick={onUnlinkClick}
          onSetPrimaryClick={onSetPrimaryClick}
        />
      ),
    },
  ];
}
