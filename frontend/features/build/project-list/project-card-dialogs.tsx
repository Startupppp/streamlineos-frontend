"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
    () => {
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

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={onArchiveConfirmOpenChange}
        title={isArchived ? "Restore project?" : "Archive project?"}
        description={
          isArchived
            ? "This project will be restored and set to Active."
            : "You can restore this project later from the project list."
        }
        confirmLabel={isArchived ? "Restore" : "Archive"}
        isPending={archiveProject.isPending}
        keepOpenOnConfirm
        onConfirm={handleArchiveConfirm}
      />

      <DeleteProjectDialog
        open={deleteConfirmOpen}
        onOpenChange={onDeleteConfirmOpenChange}
        projectId={project.id}
        projectName={project.name}
      />
    </>
  );
}
