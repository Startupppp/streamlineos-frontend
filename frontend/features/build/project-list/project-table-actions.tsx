"use client";

import React from "react";
import { Pencil, Archive, Trash2, RotateCcw } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, isPast, differenceInDays } from "date-fns";
import { getColorSafe } from "@/lib/theme-constants";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { ProjectListItem } from "@/types/projects/projects";
import { statusDotColors } from "./project-card-utils";

export const dateToneClasses = {
  muted: "text-muted-foreground",
  soon: "text-status-warning-ink",
  overdue: "text-status-danger-ink",
} as const;

export function StatusDot({ status }: { status: string }) {
  const dotColor = getColorSafe(statusDotColors, status);
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        dotColor,
      )}
      aria-hidden="true"
    />
  );
}

export function resolveTargetDate(
  endDate: Date | string | null,
  status: string,
): { label: string; tone: "muted" | "soon" | "overdue" } | null {
  if (!endDate) return null;
  const date = new Date(endDate);
  const terminal = status === "COMPLETED" || status === "ARCHIVED";
  if (!terminal && isPast(date)) {
    return { label: format(date, "MMM d"), tone: "overdue" };
  }
  const daysLeft = differenceInDays(date, new Date());
  if (!terminal && daysLeft >= 0 && daysLeft <= 7) {
    return { label: format(date, "MMM d"), tone: "soon" };
  }
  return { label: format(date, "MMM d"), tone: "muted" };
}

export function ActionsCell({
  project,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: ProjectListItem;
  onEdit: (p: ProjectListItem) => void;
  onArchive: (p: ProjectListItem) => void;
  onDelete: (p: ProjectListItem) => void;
}) {
  const canUpdate = useCan("build:update");
  const canManage = useCan("build:manage");
  const canEdit = canUpdate || canManage;
  const canDelete = useCan("build:delete");
  const isArchived = (project.status ?? "ACTIVE") === "ARCHIVED";
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  if (!canEdit && !canDelete) return null;

  function handleStopPropagation(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }
  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(project);
  }
  function handleArchiveClick(e: React.MouseEvent) {
    e.stopPropagation();
    onArchive(project);
  }
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(project);
  }

  return (
    <div onClick={handleStopPropagation} onKeyDown={handleStopPropagation}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
            aria-label={`Actions for ${project.name}`}
            {...hoverHandlers}
          >
            <EllipsisIcon ref={iconRef} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canEdit ? (
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit project
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem onClick={handleArchiveClick}>
              {isArchived ? (
                <>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Restore project
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-3.5 w-3.5" />
                  Archive project
                </>
              )}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete project
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
