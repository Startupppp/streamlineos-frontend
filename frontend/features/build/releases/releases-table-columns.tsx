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
import type { Release } from "@/hooks/api/build/releases";
import { format } from "date-fns";
import { STATUS_CONFIG } from "./releases-page-parts";

export const RELEASES_TABLE_HEADERS = [
  "Name",
  "Status",
  "Release Date",
  "Tickets",
  "Actions",
] as const;

interface ReleaseRowHandlers {
  canManage: boolean;
  onEdit: (r: Release) => void;
  onDelete: (r: Release) => void;
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
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <ReleaseStatusBadge status={r.status} />,
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
      key: "ticketCount",
      header: "Tickets",
      cell: (r) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          {r.ticketCount}
        </span>
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
        { label: "Tickets", value: release.ticketCount },
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
