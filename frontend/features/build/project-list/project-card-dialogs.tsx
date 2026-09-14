"use client";

import { useCallback, type MouseEvent } from "react";
import dynamic from "next/dynamic";
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
import { useArchiveProject } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ProjectListItem } from "@/types/projects/projects";

const EditProjectSheet = dynamic(
  () => import("./edit-project-sheet").then((m) => ({ default: m.EditProjectSheet })),
  { ssr: false, loading: () => null },
);
const DeleteProjectDialog = dynamic(
  () =>
    import("@/features/build/sidebar/delete-project-dialog").then((m) => ({
      default: m.DeleteProjectDialog,
    })),
  { ssr: false, loading: () => null },
);

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

      <DeleteProjectDialog
        open={deleteConfirmOpen}
        onOpenChange={onDeleteConfirmOpenChange}
        projectId={project.id}
        projectName={project.name}
      />
    </>
  );
}
