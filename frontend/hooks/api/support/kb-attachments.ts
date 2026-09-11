"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
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
  key: string;
  size: number;
  mimeType: string;
}

export interface KbAttachmentDownloadResult {
  fileName: string;
  mimeType: string | null;
  downloadUrl: string;
}

const storageUploadC = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.storageUploadContract),
);
const kbAttachmentListC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbAttachmentListContract),
);
const kbAttachmentRowC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbAttachmentRowContract),
);
const kbSuccessC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbSuccessContract),
);
const kbAttachmentDownloadC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbAttachmentDownloadContract),
);

const KB_ATTACHMENT_FOLDER = "kb-attachments";

export function useSupportKbAttachments(articleId: number) {
  return useGatedQuery("support:kb:view", {
    queryKey: accountingAndSupportQueryKeys.kbAttachments.list(articleId),
    queryFn: ({ signal }) =>
      apiClient.get<KbAttachment[]>(
        `/support/kb/articles/${articleId}/attachments`,
        undefined,
        signal,
        kbAttachmentListC,
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

      const uploaded = await apiClient.upload(
        "/storage/upload",
        formData,
        storageUploadC,
      );

      return apiClient.post<KbAttachment>(
        `/support/kb/articles/${articleId}/attachments`,
        {
          fileName: file.name,
          fileKey: uploaded.key,
          fileSize: uploaded.size,
          mimeType: uploaded.mimeType,
        },
        undefined,
        kbAttachmentRowC,
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.kbAttachments.list(articleId),
      }),
  });
}

export function useDeleteSupportKbAttachment(articleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKbAttachments", "delete"],
    mutationFn: (attachmentId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/support/kb/articles/${articleId}/attachments/${attachmentId}`,
        undefined,
        undefined,
        kbSuccessC,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.kbAttachments.list(articleId),
      }),
  });
}

export function useDownloadSupportKbAttachment() {
  return useAuthorizedMutation("support:kb:view", {
    mutationKey: ["supportKbAttachments", "download"],
    mutationFn: ({
      articleId,
      attachmentId,
    }: {
      articleId: number;
      attachmentId: number;
    }) =>
      apiClient.get<KbAttachmentDownloadResult>(
        `/support/kb/articles/${articleId}/attachments/${attachmentId}/download`,
        undefined,
        undefined,
        kbAttachmentDownloadC,
      ),
  });
}
