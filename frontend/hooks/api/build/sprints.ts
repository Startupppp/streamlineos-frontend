"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Sprint,
  CreateSprintInput,
  UpdateSprintInput,
} from "@/types/projects";

export function useSprints(
  projectId?: number,
  options?: Omit<UseQueryOptions<Sprint[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Sprint[]>({
    queryKey: queryKeys.projects.sprints(projectId),
    queryFn: () =>
      apiClient.get<Sprint[]>(`/build/${projectId}/sprints`),
    enabled: !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useSprint(
  projectId: number,
  sprintId: number,
  options?: Omit<UseQueryOptions<Sprint | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Sprint | null>({
    queryKey: queryKeys.projects.sprint(sprintId),
    queryFn: () =>
      apiClient.get<Sprint | null>(`/build/${projectId}/sprints/${sprintId}`),
    enabled: !!sprintId && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateSprint(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "sprints", "create"],
    mutationFn: ({ projectId, ...data }: CreateSprintInput) =>
      apiClient.post<Sprint>(`/build/${projectId}/sprints`, data),
    onSuccess: (_data: unknown, variables: CreateSprintInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "sprints", "update"],
    mutationFn: ({ sprintId, ...data }: UpdateSprintInput) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/sprints/${sprintId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useStartSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "sprints", "start"],
    mutationFn: ({ sprintId }: { sprintId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/sprints/${sprintId}`,
        { status: "ACTIVE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useCompleteSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "sprints", "complete"],
    mutationFn: ({ sprintId }: { sprintId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/sprints/${sprintId}`,
        { status: "COMPLETED" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}
