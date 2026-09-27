"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { Module } from "@/types/projects/projects";

const moduleRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.moduleRowContract),
);

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface UpdateModuleVariables {
  projectId: number;
  moduleId: number;
  version: number;
  name?: string;
  description?: string;
  status?: string;
  leadId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface DeleteModuleVariables {
  projectId: number;
  moduleId: number;
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "modules", "update"],
    mutationFn: ({ projectId, moduleId, ...data }: UpdateModuleVariables) =>
      apiClient.patch<Module>(
        `/build/${projectId}/modules/${moduleId}`,
        data,
        undefined,
        moduleRowContract,
      ),
    onSuccess: (_: unknown, variables: UpdateModuleVariables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.modules(variables.projectId),
      });
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "modules", "delete"],
    mutationFn: ({ projectId, moduleId }: DeleteModuleVariables) =>
      apiClient.delete(
        `/build/${projectId}/modules/${moduleId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: (_: unknown, variables: DeleteModuleVariables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.modules(variables.projectId),
      });
    },
  });
}
