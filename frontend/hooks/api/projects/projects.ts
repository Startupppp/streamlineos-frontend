"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Project,
  ProjectListItem,
  ProjectWithDetails,
  ProjectMember,
  ProjectMemberRecord,
  TicketLabel,
  PaginatedResponse,
  ProjectFilters,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
} from "@/types/projects";

export function useProjects(
  filters?: ProjectFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<ProjectListItem>>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedResponse<ProjectListItem>>({
    queryKey: queryKeys.projects.list(filters ? { ...filters } : undefined),
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProjectListItem>>("/projects", filters ? { ...filters } : undefined),
    staleTime: 30_000,
    ...options,
  });
}

export function useProject(
  id: number,
  options?: Omit<UseQueryOptions<ProjectWithDetails | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectWithDetails | null>({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => apiClient.get<ProjectWithDetails | null>(`/projects/${id}`),
    enabled: !!id,
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateProject(options?: Omit<UseMutationOptions<Project, Error, CreateProjectInput>, "mutationFn">) {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, CreateProjectInput>({
    mutationKey: ["projects", "create"],
    mutationFn: (data: CreateProjectInput) => apiClient.post<Project>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

type ProjectPatch = Omit<UpdateProjectInput, "projectId">;

interface UpdateProjectContext {
  listSnapshots: [readonly unknown[], PaginatedResponse<ProjectListItem> | undefined][];
  detailKey: ReturnType<typeof queryKeys.projects.detail>;
  previousDetail: ProjectWithDetails | null | undefined;
}

function applyProjectListPatch(project: ProjectListItem, patch: ProjectPatch): ProjectListItem {
  const next: ProjectListItem = { ...project };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined) next.description = patch.description ?? null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.startDate !== undefined) next.startDate = patch.startDate;
  if (patch.endDate !== undefined) next.endDate = patch.endDate;
  return next;
}

function applyProjectDetailPatch(project: ProjectWithDetails, patch: ProjectPatch): ProjectWithDetails {
  const next: ProjectWithDetails = { ...project };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined) next.description = patch.description ?? null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.startDate !== undefined) next.startDate = patch.startDate;
  if (patch.endDate !== undefined) next.endDate = patch.endDate;
  return next;
}

export function useUpdateProject(
  options?: Omit<
    UseMutationOptions<{ success: boolean }, Error, UpdateProjectInput, UpdateProjectContext>,
    "mutationFn" | "mutationKey" | "onMutate"
  >
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateProjectInput, UpdateProjectContext>({
    ...options,
    mutationKey: ["projects", "update"],
    mutationFn: ({ projectId, ...data }: UpdateProjectInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}`, data),
    onMutate: async (variables) => {
      const { projectId, ...patch } = variables;
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all });
      const listSnapshots = queryClient.getQueriesData<PaginatedResponse<ProjectListItem>>({
        queryKey: queryKeys.projects.all,
      });
      queryClient.setQueriesData<PaginatedResponse<ProjectListItem>>(
        { queryKey: queryKeys.projects.all },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((p) =>
              p.id === projectId ? applyProjectListPatch(p, patch) : p,
            ),
          };
        },
      );
      const detailKey = queryKeys.projects.detail(projectId);
      const previousDetail = queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
      if (previousDetail) {
        queryClient.setQueryData<ProjectWithDetails | null>(detailKey, (old) =>
          old ? applyProjectDetailPatch(old, patch) : old,
        );
      }
      return { listSnapshots, detailKey, previousDetail };
    },
    onError: (error, variables, context, mutFnCtx) => {
      if (context) {
        for (const [key, data] of context.listSnapshots) {
          queryClient.setQueryData(key, data);
        }
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      options?.onError?.(error, variables, context, mutFnCtx);
    },
    onSettled: (data, error, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}

export function useDeleteProject(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { projectId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { projectId: number }>({
    mutationKey: ["projects", "delete"],
    mutationFn: ({ projectId }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

export function useArchiveProject(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { projectId: number; restore?: boolean }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { projectId: number; restore?: boolean }>({
    mutationKey: ["projects", "archive"],
    mutationFn: ({ projectId, restore }) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}`, {
        status: restore ? "ACTIVE" : "ARCHIVED",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

export function useProjectMembers(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectMemberRecord[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectMemberRecord[]>({
    queryKey: queryKeys.projects.members(projectId),
    queryFn: () => apiClient.get<ProjectMemberRecord[]>(`/projects/${projectId}/members`),
    enabled: !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useAddProjectMember(
  options?: Omit<UseMutationOptions<ProjectMember, Error, AddProjectMemberInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<ProjectMember, Error, AddProjectMemberInput>({
    mutationKey: ["projects", "members", "add"],
    mutationFn: ({ projectId, ...data }: AddProjectMemberInput) =>
      apiClient.post<ProjectMember>(`/projects/${projectId}/members`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(variables.projectId) });
    },
    ...options,
  });
}

type RemoveMemberInput = { projectId: number; userId: string };

export function useRemoveProjectMember(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, RemoveMemberInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, RemoveMemberInput>({
    mutationKey: ["projects", "members", "remove"],
    mutationFn: ({ projectId, userId }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/members`, { data: { userId } }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(variables.projectId) });
    },
    ...options,
  });
}

export function useProjectLabels(
  projectId?: number,
  options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">
) {
  return useQuery<TicketLabel[]>({
    queryKey: queryKeys.projects.labels(projectId),
    queryFn: () =>
      projectId
        ? apiClient.get<TicketLabel[]>(`/projects/${projectId}/labels`)
        : apiClient.get<TicketLabel[]>("/projects/labels"),
    staleTime: 60_000,
    ...options,
  });
}
