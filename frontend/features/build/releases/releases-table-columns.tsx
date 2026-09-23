"use client";

import { useCallback, type MouseEvent } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { TABLE_TITLE_CELL, TEXT_FLEX_CHILD } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { Release } from "@/hooks/api/build/releases";
import { format } from "date-fns";
import { STATUS_CONFIG, DeleteReleaseButton } from "./releases-page-parts";

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

function ReleaseEditButton({
  release,
  onEdit,
}: {
  release: Release;
  onEdit: (r: Release) => void;
}) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onEdit(release);
    },
    [release, onEdit],
  );
  return (
    <Button
      size="icon"
      variant="ghost"
      className="w-7"
      onClick={handleClick}
      aria-label={`Edit ${release.name}`}
    >
      <Pencil className="h-3 w-3" />
    </Button>
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
            <ReleaseEditButton release={r} onEdit={onEdit} />
            <DeleteReleaseButton onClick={() => onDelete(r)} />
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
            <ReleaseEditButton release={release} onEdit={onEdit} />
            <DeleteReleaseButton onClick={() => onDelete(release)} />
          </div>
        ) : null
      }
    />
  );
}
