"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ProjectView,
  CreateViewInput,
  UpdateViewInput,
  CreateWorkspaceViewInput,
  UpdateWorkspaceViewInput,
} from "@/types/projects";

const viewPageContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewPageContract),
);
const viewRowContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewRowContract),
);
const viewListContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewListContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type ViewPage = { data: ProjectView[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } };

export function useViews(
  projectId: number,
  params?: { cursor?: string | null; search?: string },
  options?: Omit<UseQueryOptions<ViewPage>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  const queryParams: Record<string, string> = {};
  const cursor = params?.cursor ?? undefined;
  const search = params?.search || undefined;
  if (cursor) queryParams.cursor = cursor;
  if (search) queryParams.search = search;
  return useQuery<ViewPage>({
    queryKey: [...buildWorkQueryKeys.projects.views(projectId), queryParams],
    queryFn: ({ signal }) =>
      apiClient.get(`/build/${projectId}/views`, Object.keys(queryParams).length > 0 ? queryParams : undefined, signal, viewPageContract),
    staleTime: 60_000,
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useCreateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "views", "create"],
    mutationFn: ({ projectId, ...data }: CreateViewInput) =>
      apiClient.post<ProjectView>(`/build/${projectId}/views`, data, undefined, viewRowContract),
    onSuccess: (_: unknown, variables: CreateViewInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.views(variables.projectId),
      });
    },
  });
}

export function useUpdateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "views", "update"],
    mutationFn: ({ viewId, projectId, ...data }: UpdateViewInput & { projectId: number }) =>
      apiClient.patch<ProjectView>(`/build/${projectId}/views/${viewId}`, data, undefined, viewRowContract),
    onSuccess: (_: unknown, variables: UpdateViewInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.views(variables.projectId),
      });
    },
  });
}

export function useDeleteView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "views", "delete"],
    mutationFn: ({ viewId, projectId }: { viewId: number; projectId: number }) =>
      apiClient.delete<void>(`/build/${projectId}/views/${viewId}`, undefined, undefined, noContentLazy),
    onSuccess: (_: unknown, variables: { viewId: number; projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.views(variables.projectId),
      });
    },
  });
}

export function useWorkspaceViews(
  options?: Omit<UseQueryOptions<ProjectView[]>, "queryKey" | "queryFn">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectView[]>({
    queryKey: buildWorkQueryKeys.projects.workspaceViews(),
    queryFn: ({ signal }) => apiClient.get<ProjectView[]>("/build/views", undefined, signal, viewListContract),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateWorkspaceView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "workspace-views", "create"],
    mutationFn: (data: CreateWorkspaceViewInput) =>
      apiClient.post<ProjectView>("/build/views", data, undefined, viewRowContract),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.workspaceViews(),
      });
    },
  });
}

export function useUpdateWorkspaceView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "workspace-views", "update"],
    mutationFn: ({ viewId, ...data }: UpdateWorkspaceViewInput) =>
      apiClient.patch<ProjectView>(`/build/views/${viewId}`, data, undefined, viewRowContract),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.workspaceViews(),
      });
    },
  });
}

export function useDeleteWorkspaceView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "workspace-views", "delete"],
    mutationFn: ({ viewId }: { viewId: number }) =>
      apiClient.delete<void>(`/build/views/${viewId}`, undefined, undefined, noContentLazy),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.workspaceViews(),
      });
    },
  });
}
