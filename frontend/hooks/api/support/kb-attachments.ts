"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface KbAttachment {
  id: number;
  articleId: number;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  createdAt: string | null;
}

export interface PublicKbAttachment {
  id: number;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string | null;
  downloadUrl: string | null;
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

export function useKbAttachments(articleId: number) {
  return useQuery({
    queryKey: queryKeys.kbAttachments.list(articleId),
    queryFn: () =>
      apiClient.get<KbAttachment[]>(
        `/support/kb/articles/${articleId}/attachments`,
      ),
    enabled: Number.isFinite(articleId) && articleId > 0,
    staleTime: 30_000,
  });
}

export function useUploadKbAttachment(articleId: number) {
  const qc = useQueryClient();
  return useMutation({
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

export function useDeleteKbAttachment(articleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/support/kb/articles/${articleId}/attachments/${attachmentId}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.kbAttachments.list(articleId) }),
  });
}

export function useKbAttachmentDownloadUrl(articleId: number) {
  return useMutation({
    mutationFn: (attachmentId: number) =>
      apiClient.get<AttachmentDownloadResponse>(
        `/support/kb/articles/${articleId}/attachments/${attachmentId}`,
      ),
  });
}

export function usePublicKbAttachments(orgId: string, slug: string) {
  return useQuery({
    queryKey: queryKeys.kbAttachments.publicList(orgId, slug),
    queryFn: () =>
      apiClient.get<PublicKbAttachment[]>(
        `/public/kb/${slug}/attachments`,
        { org: orgId },
      ),
    enabled: Boolean(orgId) && Boolean(slug),
    staleTime: 60_000,
  });
}
