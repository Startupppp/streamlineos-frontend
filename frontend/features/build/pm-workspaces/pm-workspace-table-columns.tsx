"use client";

import { useCallback } from "react";
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
import type { PmWorkspace } from "@/types/projects";
import { PmWorkspaceStatusBadge } from "./pm-workspace-status-badge";

export const PM_WORKSPACE_TABLE_HEADERS = [
  "Name",
  "Slug",
  "Status",
  "Actions",
] as const;

interface PmWorkspaceRowHandlers {
  canUpdate: boolean;
  canDelete: boolean;
  canViewMembers: boolean;
  onEdit: (row: PmWorkspace) => void;
  onDelete: (row: PmWorkspace) => void;
  onMembers: (row: PmWorkspace) => void;
}

export function WorkspaceRowActions({
  workspace,
  canUpdate,
  canDelete,
  canViewMembers,
  onEdit,
  onDelete,
  onMembers,
}: { workspace: PmWorkspace } & PmWorkspaceRowHandlers) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(workspace), [workspace, onEdit]);
  const handleDelete = useCallback(() => onDelete(workspace), [workspace, onDelete]);
  const handleMembers = useCallback(() => onMembers(workspace), [workspace, onMembers]);
  const canDeleteRow = canDelete && !workspace.isDefault;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${workspace.name}`}
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate ? (
          <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        ) : null}
        {canViewMembers ? (
          <DropdownMenuItem onClick={handleMembers}>Members</DropdownMenuItem>
        ) : null}
        {canDeleteRow ? (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildPmWorkspaceColumns({
  canUpdate,
  canDelete,
  canViewMembers,
  onEdit,
  onDelete,
  onMembers,
}: PmWorkspaceRowHandlers): DataTableColumn<PmWorkspace>[] {
  const canManageRow = canUpdate || canDelete || canViewMembers;
  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn("font-medium text-foreground", TEXT_ONE_LINE)}
            title={row.name}
          >
            {row.name}
          </span>
          {row.isDefault ? (
            <Badge
              variant="outline"
              className="px-1.5 py-0.5 text-micro text-muted-foreground"
            >
              Default
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      className: "w-40",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.slug}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <PmWorkspaceStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) =>
        canManageRow ? (
          <WorkspaceRowActions
            workspace={row}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canViewMembers={canViewMembers}
            onEdit={onEdit}
            onDelete={onDelete}
            onMembers={onMembers}
          />
        ) : null,
    },
  ];
}

export function PmWorkspaceMobileCard({
  workspace,
  canUpdate,
  canDelete,
  canViewMembers,
  onEdit,
  onDelete,
  onMembers,
}: { workspace: PmWorkspace } & PmWorkspaceRowHandlers) {
  const canManageRow = canUpdate || canDelete || canViewMembers;
  return (
    <BuildMobileCard
      title={workspace.name}
      status={<PmWorkspaceStatusBadge status={workspace.status} />}
      meta={[{ label: "Slug", value: workspace.slug }]}
      actions={
        canManageRow ? (
          <WorkspaceRowActions
            workspace={workspace}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canViewMembers={canViewMembers}
            onEdit={onEdit}
            onDelete={onDelete}
            onMembers={onMembers}
          />
        ) : null
      }
    />
  );
}
