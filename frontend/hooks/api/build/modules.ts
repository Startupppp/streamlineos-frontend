"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { Module, CreateModuleInput } from "@/types/projects";

const moduleRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.moduleRowContract),
);

const moduleListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.moduleResponseContract),
);

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type ModulePage = {
  data: Module[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

export function useModules(
  projectId: number,
  options?: Omit<UseQueryOptions<Module[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<Module[]>({
    queryKey: buildWorkQueryKeys.projects.modules(projectId),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<ModulePage>(`/build/${projectId}/modules`, undefined, signal, moduleListContract);
      return response.data;
    },
    staleTime: 60_000,
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useModulePages(projectId: number, search?: string) {
  const canView = useCan("build:view");
  return useInfiniteQuery<ModulePage>({
    queryKey: [...buildWorkQueryKeys.projects.modules(projectId), "pages", { search }],
    initialPageParam: NO_CURSOR_YET,
    queryFn: async ({ signal, pageParam }) => {
      const query: Record<string, string> = { pageSize: "50" };
      if (typeof pageParam === "string" && pageParam) query.cursor = pageParam;
      if (search) query.search = search;
      const response = await apiClient.get<ModulePage>(`/build/${projectId}/modules`, query, signal, moduleListContract);
      return response;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canView && !!projectId,
  });
}

export function useCreateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "modules", "create"],
    mutationFn: ({ projectId, ...data }: CreateModuleInput) =>
      apiClient.post<Module>(`/build/${projectId}/modules`, data, undefined, moduleRowContract),
    onSuccess: (_: unknown, variables: CreateModuleInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.modules(variables.projectId),
      });
    },
  });
}

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
