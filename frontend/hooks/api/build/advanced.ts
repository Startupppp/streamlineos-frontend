"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const epicListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.epicListContract),
);
const cycleListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleListContract),
);
const cycleRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleRowContract),
);
const moduleListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.moduleListContract),
);
const moduleRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.moduleRowContract),
);
const viewListContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewListContract),
);
const viewRowContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewRowContract),
);
const intakeListContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeListContract),
);
const intakeItemContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeItemContract),
);
const analyticsContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.analyticsContract),
);
const successContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.successContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
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
    queryFn: ({ signal }) => apiClient.get<Epic[]>(`/build/${projectId}/epics`, undefined, signal, epicListContract),
    staleTime: 30_000,
    ...options,
    enabled: canView && !!projectId,
  });
}


export function useCycles(
  projectId: number,
  options?: Omit<UseQueryOptions<Cycle[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:cycles:view");
  return useQuery<Cycle[]>({
    queryKey: buildWorkQueryKeys.projects.cycles(projectId),
    queryFn: ({ signal }) => apiClient.get<Cycle[]>(`/build/${projectId}/cycles`, undefined, signal, cycleListContract),
    staleTime: 60_000,
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useCreateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "cycles", "create"],
    mutationFn: ({ projectId, ...data }: CreateCycleInput) =>
      apiClient.post<Cycle>(`/build/${projectId}/cycles`, data, undefined, cycleRowContract),
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
    queryFn: ({ signal }) => apiClient.get<Module[]>(`/build/${projectId}/modules`, undefined, signal, moduleListContract),
    staleTime: 60_000,
    ...options,
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

export function useViews(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectView[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectView[]>({
    queryKey: buildWorkQueryKeys.projects.views(projectId),
    queryFn: ({ signal }) => apiClient.get<ProjectView[]>(`/build/${projectId}/views`, undefined, signal, viewListContract),
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
  const queryParams = Object.keys(query).length ? query : undefined;
  return useQuery<IntakePage>({
    queryKey: buildWorkQueryKeys.projects.intake(projectId, queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<IntakePage>(
        `/build/${projectId}/intake`,
        queryParams,
        signal,
        intakeListContract,
      ),
    staleTime: 30_000,
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useCreateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "intake", "create"],
    mutationFn: ({ projectId, ...data }: CreateIntakeRequestInput) =>
      apiClient.post<IntakeRequest>(`/build/${projectId}/intake`, data, undefined, intakeItemContract),
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
    mutationFn: ({ intakeRequestId, projectId, ...data }: UpdateIntakeRequestInput & { projectId: number }) =>
      apiClient.patch<IntakeRequest>(
        `/build/${projectId}/intake/${intakeRequestId}`,
        data,
        undefined,
        intakeItemContract,
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
      apiClient.get<ProjectAnalytics>(`/build/${projectId}/analytics`, undefined, signal, analyticsContract),
    enabled: canView && !!projectId,
    staleTime: 5 * 60_000,
    ...options,
  });
}
