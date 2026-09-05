"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Epic,
  Cycle,
  Module,
  ProjectView,
  IntakeRequest,
  ProjectAnalytics,
  CreateCycleInput,
  CreateModuleInput,
  CreateViewInput,
  UpdateViewInput,
  CreateWorkspaceViewInput,
  UpdateWorkspaceViewInput,
  CreateIntakeRequestInput,
  UpdateIntakeRequestInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useEpics(
  projectId: number,
  options?: Omit<UseQueryOptions<Epic[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<Epic[]>({
    queryKey: buildWorkQueryKeys.projects.epics(projectId),
    queryFn: ({ signal }) => apiClient.get<Epic[]>(`/build/${projectId}/epics`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}


export function useCycles(
  projectId: number,
  options?: Omit<UseQueryOptions<Cycle[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<Cycle[]>({
    queryKey: buildWorkQueryKeys.projects.cycles(projectId),
    queryFn: ({ signal }) => apiClient.get<Cycle[]>(`/build/${projectId}/cycles`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "cycles", "create"],
    mutationFn: ({ projectId, ...data }: CreateCycleInput) =>
      apiClient.post<Cycle>(`/build/${projectId}/cycles`, data),
    onSuccess: (_: unknown, variables: CreateCycleInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.cycles(variables.projectId),
      });
    },
  });
}

export function useModules(
  projectId: number,
  options?: Omit<UseQueryOptions<Module[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<Module[]>({
    queryKey: buildWorkQueryKeys.projects.modules(projectId),
    queryFn: ({ signal }) => apiClient.get<Module[]>(`/build/${projectId}/modules`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "modules", "create"],
    mutationFn: ({ projectId, ...data }: CreateModuleInput) =>
      apiClient.post<Module>(`/build/${projectId}/modules`, data),
    onSuccess: (_: unknown, variables: CreateModuleInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.modules(variables.projectId),
      });
    },
  });
}

export function useViews(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectView[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectView[]>({
    queryKey: buildWorkQueryKeys.projects.views(projectId),
    queryFn: ({ signal }) => apiClient.get<ProjectView[]>(`/build/${projectId}/views`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "views", "create"],
    mutationFn: ({ projectId, ...data }: CreateViewInput) =>
      apiClient.post<ProjectView>(`/build/${projectId}/views`, data),
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
    mutationFn: ({ id, projectId, ...data }: UpdateViewInput & { projectId: number }) =>
      apiClient.patch<ProjectView>(`/build/${projectId}/views/${id}`, data),
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
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/views/${id}`),
    onSuccess: (_: unknown, variables: { id: number; projectId: number }) => {
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
    queryFn: ({ signal }) => apiClient.get<ProjectView[]>("/build/views", undefined, signal),
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
      apiClient.post<ProjectView>("/build/views", data),
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
    mutationFn: ({ id, ...data }: UpdateWorkspaceViewInput) =>
      apiClient.patch<ProjectView>(`/build/views/${id}`, data),
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
    mutationFn: ({ id }: { id: number }) =>
      apiClient.delete<{ success: boolean }>(`/build/views/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.workspaceViews(),
      });
    },
  });
}

interface IntakePage {
  data: IntakeRequest[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export function useIntakeRequests(
  projectId: number,
  params?: { status?: string; cursor?: string; limit?: number },
  options?: Omit<UseQueryOptions<IntakePage>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  const query: Record<string, string> = {};
  if (params?.status) query["status"] = params.status;
  if (params?.cursor) query["cursor"] = params.cursor;
  if (params?.limit) query["limit"] = String(params.limit);
  return useQuery<IntakePage>({
    queryKey: buildWorkQueryKeys.projects.intake(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<IntakePage>(
        `/build/${projectId}/intake`,
        Object.keys(query).length ? query : undefined
      , signal),
    enabled: canView && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "intake", "create"],
    mutationFn: ({ projectId, ...data }: CreateIntakeRequestInput) =>
      apiClient.post<IntakeRequest>(`/build/${projectId}/intake`, data),
    onSuccess: (_: unknown, variables: CreateIntakeRequestInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
      });
    },
  });
}

export function useUpdateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "intake", "update"],
    mutationFn: ({ id, projectId, ...data }: UpdateIntakeRequestInput & { projectId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/intake/${id}`,
        data
      ),
    onSuccess: (_: unknown, variables: UpdateIntakeRequestInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(variables.projectId),
      });
    },
  });
}

export function useProjectAnalytics(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectAnalytics>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectAnalytics>({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectAnalytics>(`/build/${projectId}/analytics`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 5 * 60_000,
    ...options,
  });
}
