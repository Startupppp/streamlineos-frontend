"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  applyProjectDetailPatch,
  getWorkspaceUsersFromCache,
  patchProjectListCache,
} from "@/hooks/api/build/project-cache-patch";
import type {
  ProjectListCache,
  UpdateProjectContext,
} from "@/hooks/api/build/project-cache-patch";
import type {
  Project,
  ProjectWithDetails,
  TicketLabel,
  ProjectFilters,
  ProjectListResponse,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/types/projects";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export {
  useAddProjectMember,
  useProjectMembers,
  useUpdateProjectMemberRole,
} from "@/hooks/api/build/project-members";

const projectListPageLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectListPageContract),
);
const projectRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectRowContract),
);
const projectDetailLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectDetailContract),
);
const projectDeleteNoContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const labelListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketLabelListContract),
);

export function useProjects(
  filters?: ProjectFilters,
  options?: Omit<UseQueryOptions<ProjectListResponse>, "queryKey" | "queryFn">,
) {
  const canView = useCan("build:view");
  return useQuery<ProjectListResponse>({
    queryKey: buildWorkQueryKeys.projects.list(filters ? { ...filters } : undefined),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectListResponse>(
        "/build",
        filters ? { ...filters } : undefined,
        signal,
        projectListPageLazy,
      ),
    staleTime: 30_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

/**
 * The keyset walk over `GET /build`.
 *
 * The endpoint orders by descending id and takes `afterId`, and answers
 * `{ data, hasMore, nextCursor }` — no total and no page count, so a numbered
 * pager cannot be built over it and must not be faked. `limit` is fixed by the
 * caller and the cursor is the only thing that moves between pages.
 */
export function useInfiniteProjects(
  filters: ProjectFilters,
  options?: Omit<
    UseInfiniteQueryOptions<
      ProjectListResponse,
      Error,
      InfiniteData<ProjectListResponse>,
      readonly unknown[],
      number | undefined
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >,
) {
  const canView = useCan("build:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.listInfinite({ ...filters }),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<ProjectListResponse>(
        "/build",
        { ...filters, ...(pageParam === undefined ? {} : { afterId: pageParam }) },
        signal,
        projectListPageLazy,
      ),
    initialPageParam: NO_ID_CURSOR_YET,
    getNextPageParam: (lastPage: ProjectListResponse) =>
      lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
}

export function useProject(
  id: number,
  options?: Omit<
    UseQueryOptions<ProjectWithDetails | null>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  const canView = useCan("build:view");
  return useQuery<ProjectWithDetails | null>({
    queryKey: buildWorkQueryKeys.projects.detail(id),
    queryFn: ({ signal }) => apiClient.get<ProjectWithDetails | null>(`/build/${id}`, undefined, signal, projectDetailLazy),
    enabled: canView && !!id,
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateProject(
  options?: Omit<
    UseMutationOptions<Project, Error, CreateProjectInput>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Project, Error, CreateProjectInput>("build:create", {
    ...options,
    mutationKey: ["projects", "create"],
    mutationFn: (data: CreateProjectInput) =>
      apiClient.post<Project>("/build", data, undefined, projectRowLazy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}

export function useUpdateProject(
  options?: Omit<
    UseMutationOptions<
      ProjectWithDetails,
      Error,
      UpdateProjectInput,
      UpdateProjectContext
    >,
    "mutationFn" | "mutationKey" | "onMutate"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    ProjectWithDetails,
    Error,
    UpdateProjectInput,
    UpdateProjectContext
  >("build:update", {
    ...options,
    mutationKey: ["projects", "update"],
    mutationFn: ({ projectId, ...data }: UpdateProjectInput) =>
      apiClient.patch<ProjectWithDetails>(`/build/${projectId}`, data, undefined, projectDetailLazy),
    onMutate: async (variables) => {
      const { projectId, ...patch } = variables;
      await queryClient.cancelQueries({ queryKey: buildWorkQueryKeys.projects.all });
      const workspaceUsers = getWorkspaceUsersFromCache(queryClient);
      const listSnapshots = queryClient.getQueriesData<ProjectListCache>({
        queryKey: buildWorkQueryKeys.projects.all,
      });
      queryClient.setQueriesData<ProjectListCache>(
        { queryKey: buildWorkQueryKeys.projects.all },
        (old) => patchProjectListCache(old, projectId, patch, workspaceUsers),
      );
      const detailKey = buildWorkQueryKeys.projects.detail(projectId);
      const previousDetail =
        queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
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
        queryKey: buildWorkQueryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.members(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}

export function useDeleteProject(
  options?: Omit<
    UseMutationOptions<void, Error, { projectId: number }>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: number }>({
    ...options,
    mutationKey: ["projects", "delete"],
    mutationFn: ({ projectId }) =>
      apiClient.delete<void>(`/build/${projectId}`, undefined, undefined, projectDeleteNoContentLazy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}

export function useArchiveProject(
  options?: Omit<
    UseMutationOptions<
      ProjectWithDetails,
      Error,
      { projectId: number; restore?: boolean }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    ProjectWithDetails,
    Error,
    { projectId: number; restore?: boolean }
  >({
    ...options,
    mutationKey: ["projects", "archive"],
    mutationFn: ({ projectId, restore }) =>
      apiClient.patch<ProjectWithDetails>(`/build/${projectId}`, {
        status: restore ? "ACTIVE" : "ARCHIVED",
      }, undefined, projectDetailLazy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}

export function useProjectLabels(
  projectId?: number,
  options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">,
) {
  const canView = useCan("build:view");
  return useQuery<TicketLabel[]>({
    queryKey: buildWorkQueryKeys.projects.labels(projectId),
    queryFn: ({ signal }) =>
      projectId
        ? apiClient.get<TicketLabel[]>(`/build/${projectId}/labels`, undefined, signal, labelListLazy)
        : apiClient.get<TicketLabel[]>("/build/labels", undefined, signal, labelListLazy),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
