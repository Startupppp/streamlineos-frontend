"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type ExcalidrawScene = Record<string, unknown>;

export interface WhiteboardSummary {
  id: number;
  name: string;
  elementCount: number;
  updatedAt: string | null;
}

interface Whiteboard {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  data: ExcalidrawScene;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UpdateWhiteboardInput {
  id: number;
  name?: string;
  data?: ExcalidrawScene;
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
    queryFn: () => apiClient.get<Whiteboard>(`/projects/${projectId}/whiteboards/${whiteboardId}`),
    enabled: !!projectId && !!whiteboardId,
    staleTime: 60_000,
  });
}

export function useCreateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.post<Whiteboard>(`/projects/${projectId}/whiteboards`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) }),
  });
}

export function useUpdateWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWhiteboardInput) =>
      apiClient.patch<Whiteboard>(`/projects/${projectId}/whiteboards/${id}`, input),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.whiteboards.detail(updated.id) });
    },
  });
}

export function useDeleteWhiteboard(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/whiteboards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.whiteboards.list(projectId) }),
  });
}
