"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  id: number;
  name?: string;
  data?: ExcalidrawSceneData;
}

export interface UpdateWhiteboardSharingInput {
  id: number;
  visibility?: WhiteboardVisibility;
  publicAccess?: WhiteboardShareRole;
  linkExpiresAt?: string | null;
  allowExport?: boolean;
}

export interface SetWhiteboardSharesInput {
  id: number;
  shares: Array<{ userId: string; role: WhiteboardShareRole }>;
}

export function useWhiteboards(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.whiteboards.list(projectId),
    queryFn: ({ signal }) => apiClient.get<WhiteboardSummary[]>(`/build/${projectId}/whiteboards`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
}

export function useWhiteboard(projectId: number, whiteboardId: number | null) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.whiteboards.detail(whiteboardId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<WhiteboardDetail>(`/build/${projectId}/whiteboards/${whiteboardId}`, undefined, signal),
    enabled: canView && !!projectId && !!whiteboardId,
    staleTime: 60_000,
  });
}

export function useCreateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "create"],
    mutationFn: (name: string) =>
      apiClient.post<WhiteboardDetail>(`/build/${projectId}/whiteboards`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) }),
  });
}

export function useUpdateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:timesheets:manage", {
    mutationKey: ["projects", "whiteboards", "update"],
    mutationFn: ({ id, ...input }: UpdateWhiteboardInput) =>
      apiClient.patch<WhiteboardDetail>(`/build/${projectId}/whiteboards/${id}`, input),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.whiteboards.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) });
    },
  });
}

export function useDeleteWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/whiteboards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) }),
  });
}

export function useUpdateWhiteboardSharing(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "sharing"],
    mutationFn: ({ id, ...input }: UpdateWhiteboardSharingInput) =>
      apiClient.patch<WhiteboardSharing>(
        `/build/${projectId}/whiteboards/${id}/sharing`,
        input,
      ),
    onSuccess: (_: unknown, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) });
    },
  });
}

export function useRotateWhiteboardShareToken(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "rotate-token"],
    mutationFn: (id: number) =>
      apiClient.post<WhiteboardSharing>(
        `/build/${projectId}/whiteboards/${id}/sharing/rotate-token`,
        {},
      ),
    onSuccess: (_: unknown, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(id) });
    },
  });
}

export function useSetWhiteboardShares(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "set-shares"],
    mutationFn: ({ id, shares }: SetWhiteboardSharesInput) =>
      apiClient.put<WhiteboardShareEntry[]>(
        `/build/${projectId}/whiteboards/${id}/shares`,
        { shares },
      ),
    onSuccess: (_: unknown, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(variables.id) });
    },
  });
}

export function useRemoveWhiteboardShare(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:whiteboards:manage", {
    mutationKey: ["projects", "whiteboards", "remove-share"],
    mutationFn: ({ id, userId }: { id: number; userId: string }) =>
      apiClient.delete<{ success: boolean }>(
        `/build/${projectId}/whiteboards/${id}/shares/${userId}`,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(variables.id) });
    },
  });
}
