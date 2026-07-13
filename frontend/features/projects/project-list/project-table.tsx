"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  RotateCcw,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { format, isPast, differenceInDays } from "date-fns";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { useCan } from "@/hooks/api/access";
import { resolveImageUrl } from "@/lib/utils";
import type { ProjectListItem } from "@/types/projects/projects";
import { ProjectCardDialogs } from "./project-card-dialogs";
import { statusDotColors } from "./project-card-utils";

interface ProjectTableProps {
  projects: ProjectListItem[];
}

type ActiveDialog = "edit" | "delete" | "archive" | null;

function StatusDot({ status }: { status: string }) {
  const dotColor = getColorSafe(statusDotColors, status);
  return (
    <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", dotColor)} aria-hidden="true" />
  );
}

function resolveTargetDate(
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

const dateToneClasses = {
  muted: "text-muted-foreground",
  soon: "text-amber-600 dark:text-amber-400",
  overdue: "text-red-600 dark:text-red-400",
} as const;

function ActionsCell({
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
  const canUpdate = useCan("projects:update");
  const canDelete = useCan("projects:delete");
  const isArchived = (project.status ?? "ACTIVE") === "ARCHIVED";

  if (!canUpdate && !canDelete) return null;

  function handleStopPropagation(e: React.MouseEvent) { e.stopPropagation(); }
  function handleEditClick(e: React.MouseEvent) { e.stopPropagation(); onEdit(project); }
  function handleArchiveClick(e: React.MouseEvent) { e.stopPropagation(); onArchive(project); }
  function handleDeleteClick(e: React.MouseEvent) { e.stopPropagation(); onDelete(project); }

  return (
    <div onClick={handleStopPropagation}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Actions for ${project.name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canUpdate && (
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit project
            </DropdownMenuItem>
          )}
          {canUpdate && (
            <DropdownMenuItem onClick={handleArchiveClick}>
              {isArchived ? (
                <><RotateCcw className="mr-2 h-3.5 w-3.5" />Restore project</>
              ) : (
                <><Archive className="mr-2 h-3.5 w-3.5" />Archive project</>
              )}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const ProjectTable = React.memo(function ProjectTable({ projects }: ProjectTableProps) {
  const router = useRouter();
  const [activeProject, setActiveProject] = useState<ProjectListItem | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const handleEdit = useCallback((p: ProjectListItem) => {
    setActiveProject(p);
    setActiveDialog("edit");
  }, []);

  const handleArchive = useCallback((p: ProjectListItem) => {
    setActiveProject(p);
    setActiveDialog("archive");
  }, []);

  const handleDelete = useCallback((p: ProjectListItem) => {
    setActiveProject(p);
    setActiveDialog("delete");
  }, []);

  function handleDialogClose(open: boolean) {
    if (!open) setActiveDialog(null);
  }

  const columns = useMemo<DataTableColumn<ProjectListItem>[]>(() => [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (p) => p.name,
      cell: (p) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold tracking-tight bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            {p.key.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors min-w-0">
            {p.name}
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground/60 shrink-0">
            {p.key}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (p) => p.status ?? "",
      className: "w-[120px]",
      cell: (p) => {
        const status = p.status ?? "ACTIVE";
        const displayLabel = projectStatusDisplayLabels[status] ?? status;
        const statusColor = getColorSafe(projectStatusColors, status);
        return (
          <Badge
            variant="secondary"
            className={cn(
              "gap-1 rounded-full border-0 px-2 py-0.5 text-[10px] font-medium",
              statusColor,
            )}
          >
            <StatusDot status={status} />
            {displayLabel}
          </Badge>
        );
      },
    },
    {
      key: "lead",
      header: "Lead",
      sortable: true,
      sortValue: (p) => getUserDisplayName(p.manager),
      headerClassName: "hidden md:table-cell",
      className: "w-[140px] hidden md:table-cell",
      cell: (p) => {
        const leadName = getUserDisplayName(p.manager);
        const leadInitials = getUserInitials(p.manager);
        return p.manager ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5 shrink-0">
              {p.manager.image ? (
                <AvatarImage src={resolveImageUrl(p.manager.image)} alt={leadName} />
              ) : null}
              <AvatarFallback className="text-[9px]">{leadInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{leadName}</span>
          </div>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            Unassigned
          </span>
        );
      },
    },
    {
      key: "endDate",
      header: "Target",
      sortable: true,
      sortValue: (p) => (p.endDate ? new Date(p.endDate).getTime() : Infinity),
      headerClassName: "hidden lg:table-cell",
      className: "w-[100px] hidden lg:table-cell",
      cell: (p) => {
        const status = p.status ?? "ACTIVE";
        const targetDate = resolveTargetDate(p.endDate, status);
        return targetDate ? (
          <div className={cn("flex items-center gap-1 text-xs font-medium", dateToneClasses[targetDate.tone])}>
            <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
            {targetDate.label}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        );
      },
    },
    {
      key: "progress",
      header: "Progress",
      sortable: true,
      sortValue: (p) => p.progress.percentage,
      headerClassName: "hidden sm:table-cell",
      className: "w-[130px] hidden sm:table-cell",
      cell: (p) => {
        const progressValue = p.progress.total > 0 ? p.progress.percentage : 0;
        return p.progress.total > 0 ? (
          <div className="flex items-center gap-2">
            <Progress value={progressValue} className="h-1 flex-1 min-w-0" />
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-7 text-right">
              {Math.round(progressValue)}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-10 pr-3",
      cell: (p) => (
        <ActionsCell
          project={p}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      ),
    },
  ], [handleEdit, handleArchive, handleDelete]);

  function handleRowClick(project: ProjectListItem) {
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <DataTable
        data={projects}
        columns={columns}
        getRowKey={(p) => p.id}
        onRowClick={handleRowClick}
        rowClassName={() => "group"}
        className="border-0 rounded-none"
        emptyState={<div className="text-center py-8 text-muted-foreground text-sm">No projects found</div>}
      />
      {activeProject && (
        <ProjectCardDialogs
          project={activeProject}
          isArchived={activeProject.status === "ARCHIVED"}
          editOpen={activeDialog === "edit"}
          onEditOpenChange={handleDialogClose}
          archiveConfirmOpen={activeDialog === "archive"}
          onArchiveConfirmOpenChange={handleDialogClose}
          deleteConfirmOpen={activeDialog === "delete"}
          onDeleteConfirmOpenChange={handleDialogClose}
        />
      )}
    </div>
  );
});
