"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
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
  const canView = useCan("build:sprints:view");
  return useQuery<Sprint[]>({
    queryKey: queryKeys.projects.sprints(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<Sprint[]>(`/build/${projectId}/sprints`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateSprint(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "sprints", "create"],
    mutationFn: ({ projectId, ...data }: CreateSprintInput) =>
      apiClient.post<Sprint>(`/build/${projectId}/sprints`, data),
    onSuccess: (_: unknown, variables: CreateSprintInput) => {
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
