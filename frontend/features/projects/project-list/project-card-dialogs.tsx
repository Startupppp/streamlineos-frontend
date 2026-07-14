"use client";

import { useCallback, type MouseEvent } from "react";
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
import { toast } from "sonner";
import { useDeleteProject, useArchiveProject } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { EditProjectSheet } from "./edit-project-sheet";
import type { ProjectListItem } from "@/types/projects/projects";

interface ProjectCardDialogsProps {
  project: ProjectListItem;
  isArchived: boolean;
  editOpen?: boolean;
  onEditOpenChange?: (open: boolean) => void;
  archiveConfirmOpen: boolean;
  onArchiveConfirmOpenChange: (open: boolean) => void;
  deleteConfirmOpen: boolean;
  onDeleteConfirmOpenChange: (open: boolean) => void;
}

export function ProjectCardDialogs({
  project,
  isArchived,
  editOpen = false,
  onEditOpenChange,
  archiveConfirmOpen,
  onArchiveConfirmOpenChange,
  deleteConfirmOpen,
  onDeleteConfirmOpenChange,
}: ProjectCardDialogsProps) {
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const handleArchiveConfirm = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (archiveProject.isPending) return;
      archiveProject.mutate(
        { projectId: project.id, restore: isArchived },
        {
          onSuccess: () => {
            toast.success(isArchived ? "Project restored" : "Project archived");
            onArchiveConfirmOpenChange(false);
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [archiveProject, project.id, isArchived, onArchiveConfirmOpenChange],
  );

  const handleDeleteConfirm = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (deleteProject.isPending) return;
      deleteProject.mutate(
        { projectId: project.id },
        {
          onSuccess: () => {
            toast.success("Project deleted");
            onDeleteConfirmOpenChange(false);
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [deleteProject, project.id, onDeleteConfirmOpenChange],
  );

  return (
    <>
      {onEditOpenChange ? (
        <EditProjectSheet open={editOpen} onOpenChange={onEditOpenChange} project={project} />
      ) : null}

      <AlertDialog open={archiveConfirmOpen} onOpenChange={onArchiveConfirmOpenChange}>
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
            <AlertDialogCancel disabled={archiveProject.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={archiveProject.isPending}>
              {archiveProject.isPending
                ? isArchived
                  ? "Restoring…"
                  : "Archiving…"
                : isArchived
                  ? "Restore"
                  : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={onDeleteConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All tickets and data in this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProject.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteProject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
