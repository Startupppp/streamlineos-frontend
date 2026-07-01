"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, MoreHorizontal, Pencil, Archive, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Progress } from "@/components/ui/progress";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { useDeleteProject, useArchiveProject } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { EditProjectSheet } from "./edit-project-sheet";
import { useCan } from "@/hooks/api/access";

interface ProjectListRowProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    description: string | null;
    startDate: Date | string | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

export const ProjectListRow = React.memo(function ProjectListRow({ project }: ProjectListRowProps) {
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
  const dateStr = project.startDate ? format(new Date(project.startDate), "MMM d") : null;

  const handleRowClick = useCallback(() => {
    router.push(`/projects/${project.id}`);
  }, [router, project.id]);

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
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:shadow-sm hover:bg-muted/30 transition-all group cursor-pointer"
        role="listitem"
        onClick={handleRowClick}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleRowClick(); }}
        aria-label={`${project.name} — ${displayLabel}. Press Enter to open.`}
      >
        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 w-14 text-center">
          {project.key}
        </span>

        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1 min-w-0">
          {project.name}
        </p>

        {project.progress.total > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 w-28">
            <Progress value={project.progress.percentage} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
              {Math.round(project.progress.percentage)}%
            </span>
          </div>
        )}

        <Badge
          variant="secondary"
          className={`text-[10px] font-medium shrink-0 hidden md:inline-flex ${statusColor}`}
        >
          {displayLabel}
        </Badge>

        <div className="hidden lg:block shrink-0">
          <AvatarStack
            users={project.members}
            limit={3}
            className="[&>div]:h-6 [&>div]:w-6"
          />
        </div>

        {dateStr && (
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {dateStr}
          </div>
        )}

        {(canUpdate || canDelete) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Project actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              {canUpdate && (
                <DropdownMenuItem onClick={handleEditClick}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit project
                </DropdownMenuItem>
              )}
              {canUpdate && (
                <DropdownMenuItem onClick={handleArchiveClick}>
                  {isArchived ? (
                    <><RotateCcw className="h-3.5 w-3.5 mr-2" />Restore project</>
                  ) : (
                    <><Archive className="h-3.5 w-3.5 mr-2" />Archive project</>
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
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        )}
      </div>

      <EditProjectSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        project={{ id: project.id, name: project.name, description: project.description, status: project.status }}
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
