"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface CustomState {
  id: number;
  orgId: string;
  projectId: number;
  name: string;
  color: string | null;
  order: number;
  type?: "unstarted" | "started" | "completed" | "cancelled";
  wipLimit?: number | null;
}

function stateKeys(projectId: number) {
  return ["projects", projectId, "custom-states"] as const;
}

export function useCustomStates(projectId: number) {
  return useQuery<CustomState[]>({
    queryKey: stateKeys(projectId),
    queryFn: () => apiClient.get<CustomState[]>(`/projects/${projectId}/custom-states`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateCustomState(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "create"],
    mutationFn: (data: { name: string; color: string; type?: string }) =>
      apiClient.post<CustomState>(`/projects/${projectId}/custom-states`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stateKeys(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useUpdateCustomState(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "update"],
    mutationFn: ({
      stateId,
      ...data
    }: {
      stateId: number;
      name?: string;
      color?: string;
      order?: number;
      type?: string;
    }) =>
      apiClient.patch<CustomState>(`/projects/${projectId}/custom-states/${stateId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stateKeys(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useReorderCustomStates(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "reorder"],
    mutationFn: async (items: { stateId: number; order: number }[]) => {
      await Promise.all(
        items.map(({ stateId, order }) =>
          apiClient.patch<CustomState>(`/projects/${projectId}/custom-states/${stateId}`, {
            order,
          }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stateKeys(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useDeleteCustomState(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "delete"],
    mutationFn: (stateId: number) =>
      apiClient.delete(`/projects/${projectId}/custom-states/${stateId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stateKeys(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
