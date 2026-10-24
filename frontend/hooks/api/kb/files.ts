"use client";

import { useQueryClient, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useCan } from "@/hooks/api/access";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { invalidateKbPageChange } from "./page-invalidation";
import type { KbFileDetail, KbFileVersion, KbUploadFileResponse } from "./kb-files-schema";

const kbFileDetailContractLazy = lazyContract(() =>
  import("./kb-files-schema").then((m) => m.kbFileDetailContract),
);
const kbFileVersionListContractLazy = lazyContract(() =>
  import("./kb-files-schema").then((m) => m.kbFileVersionListContract),
);
const kbFileVersionContractLazy = lazyContract(() =>
  import("./kb-files-schema").then((m) => m.kbFileVersionContract),
);
const kbUploadFileResponseContractLazy = lazyContract(() =>
  import("./kb-files-schema").then((m) => m.kbUploadFileResponseContract),
);
const kbFileDownloadUrlContractLazy = lazyContract(() =>
  import("./kb-files-schema").then((m) => m.kbFileDownloadUrlContract),
);

export function useKbFileDetail(
  pageId: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.fileDetail(pageId),
    queryFn: ({ signal }) =>
      apiClient.get<KbFileDetail>(
        `/kb/files/${pageId}`,
        undefined,
        signal,
        kbFileDetailContractLazy,
      ),
    enabled: canView && pageId > 0 && (options?.enabled ?? true),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useKbFileVersions(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.fileVersions(pageId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get(
        `/kb/files/${pageId}/versions`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        kbFileVersionListContractLazy,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView && pageId > 0,
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useUploadKbFile() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    KbUploadFileResponse,
    Error,
    {
      file: File;
      spaceId?: number | null;
      parentPageId?: number | null;
    }
  >("kb:pages:create", {
    mutationKey: ["kb", "files", "upload"],
    mutationFn: ({ file, spaceId, parentPageId }) => {
      const form = new FormData();
      form.append("file", file);
      if (spaceId != null) form.append("spaceId", String(spaceId));
      if (parentPageId != null)
        form.append("parentPageId", String(parentPageId));
      const config = operation.configFor({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      });
      return apiClient.upload<KbUploadFileResponse>(
        "/kb/files",
        form,
        kbUploadFileResponseContractLazy,
        config,
      );
    },
    onSuccess: (data) => {
      operation.settle();
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.kbPages(),
        exact: false,
        refetchType: "none",
      });
      invalidateKbPageChange(qc, "created", data.page.id);
      qc.setQueryData(
        knowledgeAndSurveysQueryKeys.kb.fileDetail(data.page.id),
        (prev: KbFileDetail | undefined) =>
          prev ? { ...prev, currentVersion: data.version } : undefined,
      );
    },
  });
}

export function useCreateKbFileVersion(pageId: number) {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<KbFileVersion, Error, { file: File }>(
    "kb:pages:update",
    {
      mutationKey: ["kb", "files", "versions", pageId, "create"],
      mutationFn: ({ file }) => {
        const form = new FormData();
        form.append("file", file);
        const config = operation.configFor({
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        });
        return apiClient.upload<KbFileVersion>(
          `/kb/files/${pageId}/versions`,
          form,
          kbFileVersionContractLazy,
          config,
        );
      },
      onSuccess: (version) => {
        operation.settle();
        qc.invalidateQueries({
          queryKey: knowledgeAndSurveysQueryKeys.kb.fileVersions(pageId),
          exact: true,
          refetchType: "none",
        });
        qc.setQueryData(
          knowledgeAndSurveysQueryKeys.kb.fileDetail(pageId),
          (prev: KbFileDetail | undefined) =>
            prev ? { ...prev, currentVersion: version } : undefined,
        );
      },
    },
  );
}

export function useRestoreKbFileVersion(pageId: number) {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<KbFileVersion, Error, { versionId: string }>(
    "kb:pages:update",
    {
      mutationKey: ["kb", "files", "versions", pageId, "restore"],
      mutationFn: ({ versionId }) => {
        const config = operation.configFor({ pageId, versionId });
        return apiClient.post<KbFileVersion>(
          `/kb/files/${pageId}/versions/${versionId}/restore`,
          {},
          config,
          kbFileVersionContractLazy,
        );
      },
      onSuccess: (version) => {
        operation.settle();
        qc.invalidateQueries({
          queryKey: knowledgeAndSurveysQueryKeys.kb.fileVersions(pageId),
          exact: true,
          refetchType: "none",
        });
        qc.setQueryData(
          knowledgeAndSurveysQueryKeys.kb.fileDetail(pageId),
          (prev: KbFileDetail | undefined) =>
            prev ? { ...prev, currentVersion: version } : undefined,
        );
      },
    },
  );
}

export function useKbFileDownloadUrl() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { url: string; expiresAt: string },
    Error,
    { pageId: number; versionId?: string }
  >("kb:pages:view", {
    mutationKey: ["kb", "files", "download-url"],
    mutationFn: ({ pageId, versionId }) => {
      const config = operation.configFor({ pageId, versionId });
      return apiClient.post<{ url: string; expiresAt: string }>(
        `/kb/files/${pageId}/download-url`,
        { versionId },
        config,
        kbFileDownloadUrlContractLazy,
      );
    },
    onSuccess: () => operation.settle(),
  });
}

export function useKbFilePreviewUrl() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { url: string; expiresAt: string },
    Error,
    { pageId: number; versionId?: string }
  >("kb:pages:view", {
    mutationKey: ["kb", "files", "preview-url"],
    mutationFn: ({ pageId, versionId }) => {
      const config = operation.configFor({ pageId, versionId });
      return apiClient.post<{ url: string; expiresAt: string }>(
        `/kb/files/${pageId}/preview-url`,
        { versionId },
        config,
        kbFileDownloadUrlContractLazy,
      );
    },
    onSuccess: () => operation.settle(),
  });
}
