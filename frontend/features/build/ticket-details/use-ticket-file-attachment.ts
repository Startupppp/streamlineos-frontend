"use client";

import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import {
  MAX_PROJECT_FILE_BYTES,
  PROJECT_FILE_TYPES_LABEL,
  isAllowedProjectFileType,
  useDeleteProjectFile,
  useUploadProjectFile,
} from "@/hooks/api/build/project-files";
import { useAddAttachment } from "@/hooks/api/build/ticket-sub-resources";
import { validatePreUpload } from "@/lib/build-upload-validator";

interface UseTicketFileAttachmentInput {
  ticketId: number;
  projectId: number;
}

export function useTicketFileAttachment({
  ticketId,
  projectId,
}: UseTicketFileAttachmentInput) {
  const uploadProjectFile = useUploadProjectFile(projectId);
  const deleteProjectFile = useDeleteProjectFile(projectId);
  const addAttachment = useAddAttachment();

  async function handleAttachFiles(files: File[]) {
    for (const file of files) {
      const error = validatePreUpload(
        file,
        (f) => isAllowedProjectFileType(f.type),
        PROJECT_FILE_TYPES_LABEL,
      );
      if (error) {
        toast.error(error);
        return;
      }
    }
    const oversized = files.find((file) => file.size > MAX_PROJECT_FILE_BYTES);
    if (oversized) {
      toast.error(`${oversized.name} exceeds the 2 MB file limit.`);
      return;
    }
    let attachedCount = 0;
    const failedNames: string[] = [];
    const cleanupFailedNames: string[] = [];
    for (const file of files) {
      let uploadedFileId: number | null = null;
      try {
        const uploaded = await uploadProjectFile.mutateAsync(file);
        uploadedFileId = uploaded.id;
        await addAttachment.mutateAsync({
          ticketId,
          projectId,
          fileId: uploaded.id,
        });
        attachedCount += 1;
      } catch (err) {
        if (isApiError(err) && err.status === 400) {
          toast.error(getErrorMessage(err));
        } else {
          failedNames.push(file.name);
        }
        if (uploadedFileId !== null) {
          try {
            await deleteProjectFile.mutateAsync(uploadedFileId);
          } catch {
            cleanupFailedNames.push(file.name);
          }
        }
      }
    }
    if (attachedCount > 0) {
      toast.success(
        attachedCount === 1
          ? "File attached"
          : `${attachedCount} files attached`,
      );
    }
    if (failedNames.length > 0) {
      toast.error(`Failed to attach ${failedNames.join(", ")}. Try again.`);
    }
    if (cleanupFailedNames.length > 0) {
      toast.error(
        `Uploaded ${cleanupFailedNames.join(", ")} remains in Project files and can be removed there.`,
      );
    }
  }

  return {
    isAttachingFiles:
      uploadProjectFile.isPending ||
      addAttachment.isPending ||
      deleteProjectFile.isPending,
    handleAttachFiles,
  };
}
