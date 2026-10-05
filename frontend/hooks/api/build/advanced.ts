"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const cycleListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleListContract),
);
const cycleRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleRowContract),
);
const cycleUpdateRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleUpdateRowContract),
);
const moduleListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.moduleResponseContract),
);
const moduleRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.moduleRowContract),
);
const viewPageContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewPageContract),
);
const viewRowContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewRowContract),
);
const viewListContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.viewListContract),
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
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import type {
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

export {
  useEpicPage,
  useEpics,
  type EpicListFilters,
  type EpicPage,
} from "@/hooks/api/build/epics";

export interface CycleListFilters {
  status?: "draft" | "active" | "completed";
  q?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export type CyclePage = {
  data: Cycle[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

function cyclePageQuery(projectId: number, filters?: CycleListFilters) {
  const activeFilters = filters ?? {};
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(activeFilters))
    if (value !== undefined && value !== "") queryParams[key] = String(value);
  return {
    queryKey: [...buildWorkQueryKeys.projects.cycles(projectId), activeFilters],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      apiClient.get<CyclePage>(
        `/build/${projectId}/cycles`,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal,
        cycleListContract,
      ),
    staleTime: 60_000,
  };
}

export function useCyclePage(
  projectId: number,
  filters?: CycleListFilters,
  options?: Omit<UseQueryOptions<CyclePage>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:cycles:view");
  return useQuery<CyclePage>({
    ...cyclePageQuery(projectId, filters),
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useCycles(
  projectId: number,
  filters?: CycleListFilters,
  options?: Omit<
    UseQueryOptions<CyclePage, Error, Cycle[]>,
    "queryKey" | "queryFn" | "enabled" | "select"
  >
) {
  const canView = useCan("build:cycles:view");
  return useQuery<CyclePage, Error, Cycle[]>({
    ...cyclePageQuery(projectId, filters),
    select: (page) => page.data,
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useCreateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:cycles:manage", {
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

export interface UpdateCycleInput {
  projectId: number;
  cycleId: number;
  version: number;
  name?: string;
  description?: string;
  goal?: string;
  capacity?: number | null;
  status?: "draft" | "active" | "completed";
  startDate?: string;
  endDate?: string;
}

export function useUpdateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:cycles:manage", {
    ...options,
    mutationKey: ["projects", "cycles", "update"],
    mutationFn: ({ projectId, cycleId, ...data }: UpdateCycleInput) =>
      apiClient.patch<Cycle>(`/build/${projectId}/cycles/${cycleId}`, data, undefined, cycleUpdateRowContract),
    onSuccess: (cycle: Cycle, variables: UpdateCycleInput) => {
      const queryKey = buildWorkQueryKeys.projects.cycles(variables.projectId);
      queryClient.setQueriesData<CyclePage>({ queryKey }, (current) =>
        current
          ? { ...current, data: current.data.map((item) => item.id === cycle.id ? { ...item, ...cycle } : item) }
          : current,
      );
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.velocity(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.burnup(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.cycleTime(variables.projectId),
      });
    },
  });
}

export function useDeleteCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:cycles:manage", {
    ...options,
    mutationKey: ["projects", "cycles", "delete"],
    mutationFn: ({ projectId, cycleId }: { projectId: number; cycleId: number }) =>
      apiClient.delete<void>(`/build/${projectId}/cycles/${cycleId}`, undefined, undefined, noContentLazy),
    onSuccess: (_: unknown, variables: { projectId: number; cycleId: number }) => {
      const queryKey = buildWorkQueryKeys.projects.cycles(variables.projectId);
      queryClient.setQueriesData<CyclePage>({ queryKey }, (current) =>
        current
          ? { ...current, data: current.data.filter((cycle) => cycle.id !== variables.cycleId) }
          : current,
      );
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.velocity(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.burnup(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.cycleTime(variables.projectId),
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
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<{ data: Module[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }>(`/build/${projectId}/modules`, undefined, signal, moduleListContract);
      return response.data;
    },
    staleTime: 60_000,
    ...options,
    enabled: canView && !!projectId,
  });
}

type ModulePage = {
  data: Module[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

export function useModulePages(projectId: number, search?: string) {
  const canView = useCan("build:view");
  return useInfiniteQuery<ModulePage>({
    queryKey: [...buildWorkQueryKeys.projects.modules(projectId), "pages", { search }],
    initialPageParam: undefined as string | undefined,
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

export function useViews(
  projectId: number,
  params?: { cursor?: string | null; search?: string },
  options?: Omit<UseQueryOptions<{ data: ProjectView[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  const queryParams: Record<string, string> = {};
  const cursor = params?.cursor ?? undefined;
  const search = params?.search || undefined;
  if (cursor) queryParams.cursor = cursor;
  if (search) queryParams.search = search;
  return useQuery<{ data: ProjectView[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }>({
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

interface IntakePage {
  data: IntakeRequest[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export function useIntakeRequests(
  projectId: number,
  params?: { status?: string; source?: "manual" | "web_form" | "email"; cursor?: string; limit?: number },
  options?: Omit<UseQueryOptions<IntakePage>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  const query: Record<string, string> = {};
  if (params?.status) query["status"] = params.status;
  if (params?.source) query["source"] = params.source;
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

export function useUpdateIntakeRequest(options?: UseMutationOptions<IntakeRequest, Error, UpdateIntakeRequestInput & { projectId: number }>) {
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
    onSuccess: (_: IntakeRequest, variables: UpdateIntakeRequestInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(variables.projectId),
      });
    },
  });
}

export interface ProjectAnalyticsParams {
  range?: "7d" | "30d" | "90d";
  teamId?: number;
  ownerId?: string;
}

export function useProjectAnalytics(
  projectId: number,
  params?: ProjectAnalyticsParams,
  options?: Omit<UseQueryOptions<ProjectAnalytics>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectAnalytics>({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId, params),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectAnalytics>(`/build/${projectId}/analytics`, params, signal, analyticsContract),
    enabled: canView && !!projectId,
    staleTime: 5 * 60_000,
    ...options,
  });
}
