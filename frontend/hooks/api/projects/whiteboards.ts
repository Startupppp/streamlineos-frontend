"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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

export interface WhiteboardHubItem extends WhiteboardSummary {
  projectId: number;
  projectName: string;
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

export function useAllWhiteboards() {
  return useQuery({
    queryKey: queryKeys.whiteboards.hub(),
    queryFn: () => apiClient.get<WhiteboardHubItem[]>("/whiteboards"),
    staleTime: 30_000,
  });
}

export function useWhiteboards(projectId: number) {
  return useQuery({
    queryKey: queryKeys.whiteboards.list(projectId),
    queryFn: () => apiClient.get<WhiteboardSummary[]>(`/projects/${projectId}/whiteboards`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useWhiteboard(projectId: number, whiteboardId: number | null) {
  return useQuery({
    queryKey: queryKeys.whiteboards.detail(whiteboardId ?? 0),
    queryFn: () =>
      apiClient.get<WhiteboardDetail>(`/projects/${projectId}/whiteboards/${whiteboardId}`),
    enabled: !!projectId && !!whiteboardId,
    staleTime: 60_000,
  });
}

export function useCreateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "create"],
    mutationFn: (name: string) =>
      apiClient.post<WhiteboardDetail>(`/projects/${projectId}/whiteboards`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) }),
  });
}

export function useCreateWhiteboardInProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "create-in-project"],
    mutationFn: ({ projectId, name }: { projectId: number; name: string }) =>
      apiClient.post<WhiteboardDetail>(`/projects/${projectId}/whiteboards`, { name }),
    onSuccess: (_board, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.hub() });
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(variables.projectId) });
    },
  });
}

export function useUpdateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "update"],
    mutationFn: ({ id, ...input }: UpdateWhiteboardInput) =>
      apiClient.patch<WhiteboardDetail>(`/projects/${projectId}/whiteboards/${id}`, input),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.whiteboards.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) });
    },
  });
}

export function useDeleteWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/whiteboards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) }),
  });
}

export function useUpdateWhiteboardSharing(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "sharing"],
    mutationFn: ({ id, ...input }: UpdateWhiteboardSharingInput) =>
      apiClient.patch<WhiteboardSharing>(
        `/projects/${projectId}/whiteboards/${id}/sharing`,
        input,
      ),
    onSuccess: (_sharing, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) });
    },
  });
}

export function useRotateWhiteboardShareToken(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "rotate-token"],
    mutationFn: (id: number) =>
      apiClient.post<WhiteboardSharing>(
        `/projects/${projectId}/whiteboards/${id}/sharing/rotate-token`,
        {},
      ),
    onSuccess: (_sharing, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(id) });
    },
  });
}

export function useSetWhiteboardShares(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "set-shares"],
    mutationFn: ({ id, shares }: SetWhiteboardSharesInput) =>
      apiClient.put<WhiteboardShareEntry[]>(
        `/projects/${projectId}/whiteboards/${id}/shares`,
        { shares },
      ),
    onSuccess: (_shares, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(variables.id) });
    },
  });
}

export function useRemoveWhiteboardShare(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "whiteboards", "remove-share"],
    mutationFn: ({ id, userId }: { id: number; userId: string }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/whiteboards/${id}/shares/${userId}`,
      ),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(variables.id) });
    },
  });
}
