"use client";

import { useCallback } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DataTableColumn } from "@/components/ui/data-table";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { TABLE_TITLE_CELL, TEXT_FLEX_CHILD } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/person-display";
import type { Release } from "@/types/projects";
import { format } from "date-fns";
import { STATUS_CONFIG } from "./releases-page-parts";
import { statusToneClasses } from "@/lib/design-tokens";
import type { StatusTone } from "@/lib/design-tokens";

export const RELEASES_TABLE_HEADERS = [
  "Name",
  "Status",
  "Release Date",
  "Published",
  "Readiness",
  "Risk",
  "Tickets",
  "Created By",
  "Actions",
] as const;

const READINESS_TONE: Record<NonNullable<Release["readiness"]>, StatusTone> = {
  not_started: "neutral",
  in_progress: "info",
  ready: "success",
  blocked: "danger",
};

const READINESS_LABEL: Record<NonNullable<Release["readiness"]>, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  ready: "Ready",
  blocked: "Blocked",
};

const RISK_TONE: Record<NonNullable<Release["riskLevel"]>, StatusTone> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

const RISK_LABEL: Record<NonNullable<Release["riskLevel"]>, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

interface ReleaseRowHandlers {
  canManage: boolean;
  onEdit: (r: Release) => void;
  onDelete: (r: Release) => void;
}

const MARKUP_TAG = /<[^>]*>/g;
const COLLAPSIBLE_WHITESPACE = /\s+/g;

function releaseNotesText(description: string) {
  return description.replace(MARKUP_TAG, " ").replace(COLLAPSIBLE_WHITESPACE, " ").trim();
}

export function ReleaseStatusBadge({ status }: { status: Release["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("h-5 py-0 text-micro", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function ReleaseRowActions({
  release,
  onEdit,
  onDelete,
}: {
  release: Release;
  onEdit: (r: Release) => void;
  onDelete: (r: Release) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(release), [release, onEdit]);
  const handleDelete = useCallback(() => onDelete(release), [release, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-7" aria-label={`Actions for ${release.name}`} {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildReleasesColumns({
  canManage,
  onEdit,
  onDelete,
}: ReleaseRowHandlers): DataTableColumn<Release>[] {
  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (r) => (
        <div className={cn(TEXT_FLEX_CHILD, "space-y-0.5 overflow-hidden")}>
          <TruncatedText text={r.name} className="text-dense font-medium text-foreground" />
          <TruncatedText
            text={r.version}
            className="font-mono text-micro text-muted-foreground"
          />
          {r.description ? (
            <TruncatedText
              text={releaseNotesText(r.description)}
              className="text-micro text-muted-foreground"
            />
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <ReleaseStatusBadge status={r.status} />,
    },
    {
      key: "publishedAt",
      header: "Published",
      cell: (r) =>
        r.status !== "released" ? (
          <span className="text-dense text-muted-foreground">—</span>
        ) : r.publishedAt !== null ? (
          <span className="font-mono tabular-nums text-dense text-muted-foreground">
            {format(new Date(r.publishedAt), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-dense text-muted-foreground">Unknown</span>
        ),
    },
    {
      key: "releaseDate",
      header: "Release Date",
      cell: (r) =>
        r.releaseDate ? (
          <span className="font-mono tabular-nums text-dense text-muted-foreground">
            {format(new Date(r.releaseDate), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-dense text-muted-foreground">—</span>
        ),
    },
    {
      key: "readiness",
      header: "Readiness",
      cell: (r) => {
        if (!r.readiness) return <span className="text-dense text-muted-foreground">—</span>;
        const tone = statusToneClasses(READINESS_TONE[r.readiness]);
        return (
          <Badge variant="outline" className={cn("h-5 py-0 text-micro", tone.surface, tone.ink, tone.rule)}>
            {READINESS_LABEL[r.readiness]}
          </Badge>
        );
      },
    },
    {
      key: "riskLevel",
      header: "Risk",
      cell: (r) => {
        if (!r.riskLevel) return <span className="text-dense text-muted-foreground">—</span>;
        const tone = statusToneClasses(RISK_TONE[r.riskLevel]);
        return (
          <Badge variant="outline" className={cn("h-5 py-0 text-micro", tone.surface, tone.ink, tone.rule)}>
            {RISK_LABEL[r.riskLevel]}
          </Badge>
        );
      },
    },
    {
      key: "ticketCount",
      header: "Tickets",
      cell: (r) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          {r.ticketCount}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      cell: (r) =>
        r.createdByUser ? (
          <span className="text-dense text-muted-foreground">{getUserDisplayName(r.createdByUser)}</span>
        ) : (
          <span className="text-dense text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      cell: (r) =>
        canManage ? (
          <div className="flex items-center justify-end gap-0.5">
            <ReleaseRowActions release={r} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ) : null,
      className: "w-20",
    },
  ];
}

export function ReleaseMobileCard({
  release,
  canManage,
  onEdit,
  onDelete,
}: { release: Release } & ReleaseRowHandlers) {
  return (
    <BuildMobileCard
      title={release.name}
      status={<ReleaseStatusBadge status={release.status} />}
      meta={[
        {
          label: "Release date",
          value: release.releaseDate
            ? format(new Date(release.releaseDate), "MMM d, yyyy")
            : "—",
        },
        {
          label: "Published",
          value:
            release.status !== "released"
              ? "—"
              : release.publishedAt !== null
                ? format(new Date(release.publishedAt), "MMM d, yyyy")
                : "Unknown",
        },
        { label: "Tickets", value: release.ticketCount },
        ...(release.description
          ? [{ label: "Notes", value: releaseNotesText(release.description) }]
          : []),
        ...(release.createdByUser
          ? [{ label: "Created by", value: getUserDisplayName(release.createdByUser) }]
          : []),
      ]}
      actions={
        canManage ? (
          <div className="flex items-center gap-0.5">
            <ReleaseRowActions release={release} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ) : null
      }
    />
  );
}
