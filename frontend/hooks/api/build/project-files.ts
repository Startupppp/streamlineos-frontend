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

export interface ProjectFilePage {
  data: ProjectFileRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface UploadProjectFileInput {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export interface ProjectFileSignedUrl {
  url: string;
  expiresIn: number;
}

export function useProjectFiles(projectId: number) {
  const canView = useCan("build:files:view");
  const query = useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.files.list(projectId),
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<ProjectFilePage>(
        `/build/${projectId}/files`,
        pageParam !== undefined ? { cursor: pageParam } : {},
        signal,
        filePageContract,
      ),
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
    mutationFn: (input: UploadProjectFileInput) =>
      apiClient.post<ProjectFileRow>(
        `/build/${projectId}/files`,
        input,
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
