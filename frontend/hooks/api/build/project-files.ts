"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const filePageContract = lazyContract(() =>
  import("@/hooks/api/build/project-files-schema").then((m) => m.filePageContract),
);
const fileRowContract = lazyContract(() =>
  import("@/hooks/api/build/project-files-schema").then((m) => m.fileRowContract),
);
const signedUrlContract = lazyContract(() =>
  import("@/hooks/api/build/project-files-schema").then((m) => m.signedUrlContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface ProjectFileRow {
  id: number;
  orgId: string;
  projectId: number;
  uploadedByMembershipId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  deletedAt: string | null;
}

interface ProjectFilePage {
  data: ProjectFileRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export const MAX_PROJECT_FILE_BYTES = 2 * 1024 * 1024;

export const PROJECT_FILE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const PROJECT_FILE_TYPES_LABEL =
  "PDF, JPG, PNG, GIF, WEBP, TXT, CSV, DOC, DOCX, XLS, XLSX";

export function isAllowedProjectFileType(mimeType: string): boolean {
  return PROJECT_FILE_MIME_TYPES.includes(mimeType);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result;
      if (typeof raw !== "string") {
        reject(new Error(`Could not read ${file.name}`));
        return;
      }
      resolve(raw.slice(raw.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

interface ProjectFileSignedUrl {
  url: string;
  expiresIn: number;
}

export function useProjectFiles(projectId: number, filters?: { q?: string }) {
  const canView = useCan("build:files:view");
  const keyFilters = filters?.q ? { q: filters.q } : undefined;
  const query = useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.files.list(projectId, keyFilters),
    queryFn: ({ signal, pageParam }) => {
      const params: Record<string, string> = {};
      if (pageParam !== undefined) params["cursor"] = pageParam;
      if (filters?.q) params["q"] = filters.q;
      return apiClient.get<ProjectFilePage>(
        `/build/${projectId}/files`,
        params,
        signal,
        filePageContract,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (page) => page.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
  const data = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );
  return { ...query, data };
}

export function useUploadProjectFile(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:files:manage", {
    mutationKey: ["projects", projectId, "files", "upload"],
    mutationFn: async (file: File) =>
      apiClient.post<ProjectFileRow>(
        `/build/${projectId}/files`,
        {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: await readFileAsBase64(file),
        },
        undefined,
        fileRowContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.files.list(projectId),
      });
    },
  });
}

export function useProjectFileSignedUrl(projectId: number, fileId: number | null) {
  const canView = useCan("build:files:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.files.signedUrl(projectId, fileId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectFileSignedUrl>(
        `/build/${projectId}/files/${fileId}/url`,
        {},
        signal,
        signedUrlContract,
      ),
    enabled: canView && !!projectId && fileId !== null,
    staleTime: 55_000,
    throwOnError: false,
  });
}

export function useDeleteProjectFile(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:files:manage", {
    mutationKey: ["projects", projectId, "files", "delete"],
    mutationFn: (fileId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/files/${fileId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.files.list(projectId),
      });
    },
  });
}
