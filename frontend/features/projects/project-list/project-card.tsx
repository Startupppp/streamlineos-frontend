"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MoreHorizontal, Pencil, Archive, Trash2, RotateCcw, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDeleteProject, useArchiveProject } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { EditProjectSheet } from "./edit-project-sheet";
import { useCan } from "@/hooks/api/access";

const statusAccentBar: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  PLANNING: "bg-blue-500",
  COMPLETED: "bg-slate-400",
  ON_HOLD: "bg-amber-500",
  ARCHIVED: "bg-slate-300 dark:bg-slate-600",
};

const statusDotColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  PLANNING: "bg-blue-500",
  COMPLETED: "bg-slate-400",
  ON_HOLD: "bg-amber-500",
  ARCHIVED: "bg-slate-400",
};

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    manager: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      image: string | null;
    } | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const canUpdate = useCan("projects:update");
  const canDelete = useCan("projects:delete");

  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const status = project.status ?? "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const accentBar = getColorSafe(statusAccentBar, status);
  const statusDot = getColorSafe(statusDotColors, status);
  const dateStr = project.startDate ? format(new Date(project.startDate), "MMM d") : null;
  const progressValue = project.progress.total > 0 ? project.progress.percentage : 0;
  const hasTickets = project.progress.total > 0;
  const isComplete = progressValue >= 100;

  const handleCardClick = useCallback(() => {
    router.push(`/projects/${project.id}`);
  }, [router, project.id]);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick],
  );

  const handleStopPropagation = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditOpen(true);
  }, []);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setArchiveConfirmOpen(true);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmOpen(true);
  }, []);

  const handleArchiveConfirm = useCallback(() => {
    archiveProject.mutate(
      { projectId: project.id, restore: isArchived },
      {
        onSuccess: () => {
          toast.success(isArchived ? "Project restored" : "Project archived");
          setArchiveConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [archiveProject, project.id, isArchived]);

  const handleDeleteConfirm = useCallback(() => {
    deleteProject.mutate(
      { projectId: project.id },
      {
        onSuccess: () => {
          toast.success("Project deleted");
          setDeleteConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [deleteProject, project.id]);

  return (
    <>
      <div
        className={cn(
          "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm",
          "transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          "hover:border-blue-500/40 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        role="listitem"
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
        aria-label={`${project.name} — ${displayLabel}. Press Enter to open.`}
      >
        <div
          className={cn("absolute inset-x-0 top-0 h-0.5", accentBar)}
          aria-hidden="true"
        />

        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-foreground/70">
            {project.key}
          </span>
          <div className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className={cn(
                "gap-1 rounded-full border-0 px-2 py-0 text-[9px] font-semibold uppercase tracking-wide",
                statusColor,
              )}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot)} aria-hidden="true" />
              {displayLabel}
            </Badge>
            {(canUpdate || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
                    aria-label="Project actions"
                    onClick={handleStopPropagation}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44" onClick={handleStopPropagation}>
                  {canUpdate && (
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit project
                    </DropdownMenuItem>
                  )}
                  {canUpdate && (
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
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDeleteClick}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete project
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <h3 className="mb-0.5 line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-blue-600">
          {project.name}
        </h3>

        {project.description ? (
          <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="mb-2 line-clamp-1 text-[11px] text-muted-foreground/50">
            No description provided
          </p>
        )}

        <div className="mt-auto border-t border-border/80 pt-2.5">
          {hasTickets ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-muted-foreground">Progress</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {project.progress.done}/{project.progress.total}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({progressValue}%)
                  </span>
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    isComplete ? "bg-emerald-500" : "bg-blue-500",
                  )}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/55">
              <Ticket className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>No tickets yet</span>
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <AvatarStack
              users={project.members}
              limit={4}
              className="[&>div]:h-5 [&>div]:w-5"
            />
            {dateStr && (
              <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dateStr}
              </div>
            )}
          </div>
        </div>
      </div>

      <EditProjectSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />

      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArchived ? "Restore project?" : "Archive project?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? "This project will be restored and set to Active."
                : "You can restore this project later from the project list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={archiveProject.isPending}>
              {isArchived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All tickets and data in this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteProject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
