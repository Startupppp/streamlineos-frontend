"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Epic,
  Cycle,
  Module,
  ProjectView,
  IntakeRequest,
  ProjectAnalytics,
  CreateCycleInput,
  UpdateCycleInput,
  CreateModuleInput,
  UpdateModuleInput,
  CreateViewInput,
  UpdateViewInput,
  CreateWorkspaceViewInput,
  UpdateWorkspaceViewInput,
  CreateIntakeRequestInput,
  UpdateIntakeRequestInput,
} from "@/types/projects";

export function useEpics(
  projectId: number,
  options?: Omit<UseQueryOptions<Epic[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<Epic[]>({
    queryKey: queryKeys.projects.epics(projectId),
    queryFn: () => apiClient.get<Epic[]>(`/build/${projectId}/epics`),
    enabled: canView && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

type CreateEpicInput = {
  projectId: number;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  points?: number;
};

export function useCreateEpic(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "epics", "create"],
    mutationFn: (variables: CreateEpicInput) => {
      const { projectId, ...data } = variables;
      return apiClient.post<Epic>(`/build/${projectId}/epics`, data);
    },
    onSuccess: (_: unknown, variables: CreateEpicInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.epics(variables.projectId),
      });
    },
    ...options,
  });
}

export function useCycles(
  projectId: number,
  options?: Omit<UseQueryOptions<Cycle[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<Cycle[]>({
    queryKey: queryKeys.projects.cycles(projectId),
    queryFn: () => apiClient.get<Cycle[]>(`/build/${projectId}/cycles`),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "cycles", "create"],
    mutationFn: ({ projectId, ...data }: CreateCycleInput) =>
      apiClient.post<Cycle>(`/build/${projectId}/cycles`, data),
    onSuccess: (_: unknown, variables: CreateCycleInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.cycles(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "cycles", "update"],
    mutationFn: ({ id, projectId, ...data }: UpdateCycleInput & { projectId: number }) =>
      apiClient.patch<Cycle>(`/build/${projectId}/cycles/${id}`, data),
    onSuccess: (_: unknown, variables: UpdateCycleInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.cycles(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useModules(
  projectId: number,
  options?: Omit<UseQueryOptions<Module[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<Module[]>({
    queryKey: queryKeys.projects.modules(projectId),
    queryFn: () => apiClient.get<Module[]>(`/build/${projectId}/modules`),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "modules", "create"],
    mutationFn: ({ projectId, ...data }: CreateModuleInput) =>
      apiClient.post<Module>(`/build/${projectId}/modules`, data),
    onSuccess: (_: unknown, variables: CreateModuleInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.modules(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "modules", "update"],
    mutationFn: ({ id, projectId, ...data }: UpdateModuleInput & { projectId: number }) =>
      apiClient.patch<Module>(`/build/${projectId}/modules/${id}`, data),
    onSuccess: (_: unknown, variables: UpdateModuleInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.modules(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useViews(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectView[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectView[]>({
    queryKey: queryKeys.projects.views(projectId),
    queryFn: () => apiClient.get<ProjectView[]>(`/build/${projectId}/views`),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "views", "create"],
    mutationFn: ({ projectId, ...data }: CreateViewInput) =>
      apiClient.post<ProjectView>(`/build/${projectId}/views`, data),
    onSuccess: (_: unknown, variables: CreateViewInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "views", "update"],
    mutationFn: ({ id, projectId, ...data }: UpdateViewInput & { projectId: number }) =>
      apiClient.patch<ProjectView>(`/build/${projectId}/views/${id}`, data),
    onSuccess: (_: unknown, variables: UpdateViewInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useDeleteView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "views", "delete"],
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/views/${id}`),
    onSuccess: (_: unknown, variables: { id: number; projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useWorkspaceViews(
  options?: Omit<UseQueryOptions<ProjectView[]>, "queryKey" | "queryFn">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectView[]>({
    queryKey: queryKeys.projects.workspaceViews(),
    queryFn: () => apiClient.get<ProjectView[]>("/build/views"),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateWorkspaceView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "workspace-views", "create"],
    mutationFn: (data: CreateWorkspaceViewInput) =>
      apiClient.post<ProjectView>("/build/views", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.workspaceViews(),
      });
    },
    ...options,
  });
}

export function useUpdateWorkspaceView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "workspace-views", "update"],
    mutationFn: ({ id, ...data }: UpdateWorkspaceViewInput) =>
      apiClient.patch<ProjectView>(`/build/views/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.workspaceViews(),
      });
    },
    ...options,
  });
}

export function useDeleteWorkspaceView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "workspace-views", "delete"],
    mutationFn: ({ id }: { id: number }) =>
      apiClient.delete<{ success: boolean }>(`/build/views/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.workspaceViews(),
      });
    },
    ...options,
  });
}

export function useIntakeRequests(
  projectId: number,
  status?: string,
  options?: Omit<
    UseQueryOptions<{ items: IntakeRequest[]; total: number }>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  const canView = useCan("build:view");
  return useQuery<{ items: IntakeRequest[]; total: number }>({
    queryKey: queryKeys.projects.intake(projectId),
    queryFn: () =>
      apiClient.get<{ items: IntakeRequest[]; total: number }>(
        `/build/${projectId}/intake`,
        status ? { status } : undefined
      ),
    enabled: canView && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "intake", "create"],
    mutationFn: ({ projectId, ...data }: CreateIntakeRequestInput) =>
      apiClient.post<IntakeRequest>(`/build/${projectId}/intake`, data),
    onSuccess: (_: unknown, variables: CreateIntakeRequestInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.intake(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "intake", "update"],
    mutationFn: ({ id, projectId, ...data }: UpdateIntakeRequestInput & { projectId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/intake/${id}`,
        data
      ),
    onSuccess: (_: unknown, variables: UpdateIntakeRequestInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.intake(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useProjectAnalytics(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectAnalytics>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectAnalytics>({
    queryKey: queryKeys.projects.analytics(projectId),
    queryFn: () =>
      apiClient.get<ProjectAnalytics>(`/build/${projectId}/analytics`),
    enabled: canView && !!projectId,
    staleTime: 5 * 60_000,
    ...options,
  });
}
