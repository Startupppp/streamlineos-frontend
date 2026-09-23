"use client";

import { useCallback } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { ProjectTeam } from "@/types/projects";

export const TEAM_TABLE_HEADERS = [
  "Name",
  "Key",
  "Members",
  "Actions",
] as const;

interface TeamRowHandlers {
  canManage: boolean;
  onEdit: (row: ProjectTeam) => void;
  onDelete: (row: ProjectTeam) => void;
}

export function TeamRowActions({
  team,
  onEdit,
  onDelete,
}: {
  team: ProjectTeam;
  onEdit: (row: ProjectTeam) => void;
  onDelete: (row: ProjectTeam) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(team), [team, onEdit]);
  const handleDelete = useCallback(() => onDelete(team), [team, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${team.name}`}
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildTeamColumns({
  canManage,
  onEdit,
  onDelete,
}: TeamRowHandlers): DataTableColumn<ProjectTeam>[] {
  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          {row.icon ? (
            <span className="text-base leading-none">{row.icon}</span>
          ) : (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-micro font-bold text-white"
              style={{ backgroundColor: row.color ?? "#64748b" }}
            >
              {row.key.slice(0, 2)}
            </span>
          )}
          <Link
            href={`/build/teams/${row.id}`}
            className={cn(
              "font-medium text-foreground hover:text-primary",
              TEXT_ONE_LINE,
            )}
            title={row.name}
          >
            {row.name}
          </Link>
          {row.isPrivate ? (
            <Badge variant="outline" className="text-micro">
              Private
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "key",
      header: "Key",
      className: "w-20",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.key}</span>
      ),
    },
    {
      key: "members",
      header: "Members",
      className: "w-28",
      cell: (row) => (
        <span className="font-mono tabular-nums text-sm text-muted-foreground">
          {row.memberCount ?? 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <TeamRowActions team={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
    },
  ];
}

export function TeamMobileCard({
  team,
  canManage,
  onEdit,
  onDelete,
}: { team: ProjectTeam } & TeamRowHandlers) {
  return (
    <BuildMobileCard
      eyebrow={team.key}
      title={team.name}
      meta={[
        { label: "Members", value: team.memberCount ?? 0 },
      ]}
      actions={
        canManage ? (
          <TeamRowActions team={team} onEdit={onEdit} onDelete={onDelete} />
        ) : null
      }
    />
  );
}
