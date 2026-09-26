"use client";

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const whiteboardResponseContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.whiteboardResponseContract),
);
const whiteboardListContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.whiteboardListContract),
);
const whiteboardDetailContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.whiteboardDetailContract),
);
const whiteboardSharingUpdateContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.whiteboardSharingUpdateContract),
);
const whiteboardSharesContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.whiteboardSharesContract),
);
const successContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.successContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export type WhiteboardVisibility = "project" | "private" | "public";
export type WhiteboardShareRole = "viewer" | "editor";
export type WhiteboardAccess = "view" | "edit" | "manage";

export interface ExcalidrawSceneData {
  type?: string;
  version?: number;
  source?: string;
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface WhiteboardSummary {
  id: number;
  name: string;
  elementCount: number;
  visibility: WhiteboardVisibility;
  createdBy: string | null;
  updatedAt: string | null;
}

export interface WhiteboardShareEntry {
  userId: string;
  role: WhiteboardShareRole;
  name: string | null;
  email: string | null;
}

export interface WhiteboardSharing {
  visibility: WhiteboardVisibility;
  publicAccess: WhiteboardShareRole;
  shareToken: string | null;
  linkExpiresAt: string | null;
  allowExport: boolean;
}

export interface WhiteboardDetail {
  id: number;
  projectId: number;
  name: string;
  data: ExcalidrawSceneData;
  visibility: WhiteboardVisibility;
  access: WhiteboardAccess;
  sharing: WhiteboardSharing | null;
  shares: WhiteboardShareEntry[] | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UpdateWhiteboardInput {
  whiteboardId: number;
  name?: string;
  data?: ExcalidrawSceneData;
}

export interface UpdateWhiteboardSharingInput {
  whiteboardId: number;
  visibility?: WhiteboardVisibility;
  publicAccess?: WhiteboardShareRole;
  linkExpiresAt?: string | null;
  allowExport?: boolean;
}

export interface SetWhiteboardSharesInput {
  whiteboardId: number;
  shares: Array<{ userId: string; role: WhiteboardShareRole }>;
}

export function useWhiteboards(projectId: number) {
  const canView = useCan("build:view");
  return useInfiniteQuery({
    queryKey: accountingAndSupportQueryKeys.whiteboards.list(projectId),
    queryFn: async ({ pageParam, signal }) => {
      const params: Record<string, string> = {};
      if (pageParam !== undefined) params["cursor"] = pageParam;
      const response = await apiClient.get<
        WhiteboardSummary[] | { data: WhiteboardSummary[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }
      >(
        `/build/${projectId}/whiteboards`,
        Object.keys(params).length > 0 ? params : undefined,
        signal,
        whiteboardResponseContract,
      );
      return Array.isArray(response)
        ? { data: response, pagination: { limit: response.length || 100, hasMore: false, nextCursor: null } }
        : response;
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
}

export function useWhiteboard(projectId: number, whiteboardId: number | null) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: accountingAndSupportQueryKeys.whiteboards.detail(whiteboardId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<WhiteboardDetail>(`/build/${projectId}/whiteboards/${whiteboardId}`, undefined, signal, whiteboardDetailContract),
    enabled: canView && !!projectId && !!whiteboardId,
    staleTime: 60_000,
  });
}

export function useCreateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "create"],
    mutationFn: (name: string) =>
      apiClient.post<WhiteboardDetail>(`/build/${projectId}/whiteboards`, { name }, undefined, whiteboardDetailContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.list(projectId) }),
  });
}

export function useUpdateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "update"],
    mutationFn: ({ whiteboardId, ...input }: UpdateWhiteboardInput) =>
      apiClient.patch<WhiteboardDetail>(`/build/${projectId}/whiteboards/${whiteboardId}`, input, undefined, whiteboardDetailContract),
    onSuccess: (updated) => {
      qc.setQueryData(accountingAndSupportQueryKeys.whiteboards.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.list(projectId) });
    },
  });
}

export function useDeleteWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "delete"],
    mutationFn: (whiteboardId: number) =>
      apiClient.delete<void>(`/build/${projectId}/whiteboards/${whiteboardId}`, undefined, undefined, noContentLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.list(projectId) }),
  });
}

export function useUpdateWhiteboardSharing(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "sharing"],
    mutationFn: ({ whiteboardId, ...input }: UpdateWhiteboardSharingInput) =>
      apiClient.patch<WhiteboardSharing>(
        `/build/${projectId}/whiteboards/${whiteboardId}/sharing`,
        input,
        undefined,
        whiteboardSharingUpdateContract,
      ),
    onSuccess: (_: unknown, variables) => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.detail(variables.whiteboardId) });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.list(projectId) });
    },
  });
}

export function useRotateWhiteboardShareToken(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "rotate-token"],
    mutationFn: (whiteboardId: number) =>
      apiClient.post<WhiteboardSharing>(
        `/build/${projectId}/whiteboards/${whiteboardId}/sharing/rotate-token`,
        {},
        undefined,
        whiteboardSharingUpdateContract,
      ),
    onSuccess: (_: unknown, id) => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.detail(id) });
    },
  });
}

export function useSetWhiteboardShares(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "set-shares"],
    mutationFn: ({ whiteboardId, shares }: SetWhiteboardSharesInput) =>
      apiClient.put<WhiteboardShareEntry[]>(
        `/build/${projectId}/whiteboards/${whiteboardId}/shares`,
        { shares },
        undefined,
        whiteboardSharesContract,
      ),
    onSuccess: (_: unknown, variables) => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.detail(variables.whiteboardId) });
    },
  });
}

export function useRemoveWhiteboardShare(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "remove-share"],
    mutationFn: ({ whiteboardId, userId }: { whiteboardId: number; userId: string }) =>
      apiClient.delete<void>(
        `/build/${projectId}/whiteboards/${whiteboardId}/shares/${userId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.whiteboards.detail(variables.whiteboardId) });
    },
  });
}
