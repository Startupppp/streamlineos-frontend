"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface KbAttachment {
  id: number;
  articleId: number;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  createdAt: string | null;
}

interface StorageUploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

interface AttachmentDownloadResponse {
  url: string;
  fileName: string;
}

const KB_ATTACHMENT_FOLDER = "kb-attachments";

export function useSupportKbAttachments(articleId: number) {
  return useQuery({
    queryKey: queryKeys.kbAttachments.list(articleId),
    queryFn: ({ signal }) =>
      apiClient.get<KbAttachment[]>(
        `/support/kb/articles/${articleId}/attachments`, undefined, signal,
      ),
    enabled: Number.isFinite(articleId) && articleId > 0,
    staleTime: 30_000,
  });
}

export function useUploadSupportKbAttachment(articleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKbAttachments", "upload"],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", KB_ATTACHMENT_FOLDER);

      const uploaded = await apiClient.upload<StorageUploadResult>(
        "/storage/upload",
        formData,
      );

      return apiClient.post<KbAttachment>(
        `/support/kb/articles/${articleId}/attachments`,
        {
          fileName: file.name,
          fileKey: uploaded.key,
          fileUrl: uploaded.url,
          fileSize: uploaded.size,
          mimeType: uploaded.mimeType,
        },
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.kbAttachments.list(articleId) }),
  });
}

export function useDeleteSupportKbAttachment(articleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKbAttachments", "delete"],
    mutationFn: (attachmentId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/support/kb/articles/${articleId}/attachments/${attachmentId}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.kbAttachments.list(articleId) }),
  });
}

export function useSupportKbAttachmentDownloadUrl(articleId: number) {
  return useMutation({
    mutationKey: ["supportKbAttachments", "download-url"],
    mutationFn: (attachmentId: number) =>
      apiClient.get<AttachmentDownloadResponse>(
        `/support/kb/articles/${articleId}/attachments/${attachmentId}`,
      ),
  });
}

