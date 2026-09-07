"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const sprintListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.sprintListContract),
);
const sprintRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.sprintRowContract),
);
import type {
  Sprint,
  CreateSprintInput,
  UpdateSprintInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useSprints(
  projectId?: number,
  options?: Omit<UseQueryOptions<Sprint[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:sprints:view");
  return useQuery<Sprint[]>({
    queryKey: buildWorkQueryKeys.projects.sprints(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<Sprint[]>(`/build/${projectId}/sprints`, undefined, signal, sprintListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateSprint(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:sprints:manage", {
    ...options,
    mutationKey: ["projects", "sprints", "create"],
    mutationFn: ({ projectId, ...data }: CreateSprintInput) =>
      apiClient.post<Sprint>(`/build/${projectId}/sprints`, data, undefined, sprintRowContract),
    onSuccess: (_: unknown, variables: CreateSprintInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.sprints(variables.projectId),
      });
    },
  });
}

export function useUpdateSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:sprints:manage", {
    ...options,
    mutationKey: ["projects", "sprints", "update"],
    mutationFn: ({ sprintId, ...data }: UpdateSprintInput) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/sprints/${sprintId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.sprints(projectId),
      });
    },
  });
}
