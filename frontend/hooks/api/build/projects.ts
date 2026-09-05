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
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import type {
  Project,
  ProjectListItem,
  ProjectWithDetails,
  ProjectMember,
  ProjectMemberRecord,
  TicketLabel,
  ProjectFilters,
  ProjectListResponse,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
} from "@/types/projects";
import type { OrgMember } from "@/types/organization";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

type WorkspaceUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name?: string | null;
  image: string | null;
};

function resolveListManager(
  managerId: string,
  project: ProjectListItem,
  workspaceUsers: WorkspaceUser[],
): ProjectListItem["manager"] {
  if (project.manager?.id === managerId) return project.manager;
  const fromMembers = project.members.find((m) => m.id === managerId);
  if (fromMembers) {
    return {
      id: fromMembers.id,
      firstName: fromMembers.firstName,
      lastName: fromMembers.lastName,
      image: fromMembers.image,
    };
  }
  const fromWorkspace = workspaceUsers.find((u) => u.id === managerId);
  if (fromWorkspace) {
    return {
      id: fromWorkspace.id,
      firstName: fromWorkspace.firstName ?? fromWorkspace.name ?? null,
      lastName: fromWorkspace.lastName,
      image: fromWorkspace.image,
    };
  }
  return null;
}

function resolveListMembers(
  memberIds: string[],
  project: ProjectListItem,
  workspaceUsers: WorkspaceUser[],
): ProjectListItem["members"] {
  return memberIds.map((id) => {
    const existing = project.members.find((m) => m.id === id);
    if (existing) return existing;
    const fromWorkspace = workspaceUsers.find((u) => u.id === id);
    if (fromWorkspace) {
      return {
        id: fromWorkspace.id,
        firstName: fromWorkspace.firstName ?? fromWorkspace.name ?? null,
        lastName: fromWorkspace.lastName,
        image: fromWorkspace.image,
      };
    }
    return { id, firstName: null, lastName: null, image: null };
  });
}

function getWorkspaceUsersFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
): WorkspaceUser[] {
  const workspaceEntries = queryClient.getQueriesData<{ data: WorkspaceUser[] }>({
    queryKey: buildWorkQueryKeys.projects.workspaceMembers.all,
  });
  const fromWorkspace = workspaceEntries.flatMap(([, data]) => data?.data ?? []);

  const orgEntries = queryClient.getQueriesData<{ data: OrgMember[] }>({
    queryKey: platformCoreQueryKeys.organization.members(),
  });
  const fromOrg = orgEntries.flatMap(([, data]) =>
    (data?.data ?? []).map((m) => ({
      id: m.userId,
      firstName: m.name,
      lastName: null,
      name: m.name,
      image: m.image,
    })),
  );

  const seen = new Set<string>();
  const merged: WorkspaceUser[] = [];
  for (const user of [...fromOrg, ...fromWorkspace]) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    merged.push(user);
  }
  return merged;
}

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
        filters ? { ...filters } : undefined, signal,
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
      ),
    initialPageParam: undefined as number | undefined,
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
    queryFn: ({ signal }) => apiClient.get<ProjectWithDetails | null>(`/build/${id}`, undefined, signal),
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
      apiClient.post<Project>("/build", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}

type ProjectPatch = Omit<UpdateProjectInput, "projectId">;

/**
 * `/build` is keyset, so the list page reads it through `useInfiniteQuery` and
 * its cache is `InfiniteData`, not a single envelope. An optimistic patch that
 * only knows the flat shape leaves that page showing stale rows until a
 * refetch, so both shapes are patched and both are snapshotted.
 */
type ProjectListCache = ProjectListResponse | InfiniteData<ProjectListResponse>;

interface UpdateProjectContext {
  listSnapshots: [readonly unknown[], ProjectListCache | undefined][];
  detailKey: ReturnType<typeof buildWorkQueryKeys.projects.detail>;
  previousDetail: ProjectWithDetails | null | undefined;
}

function applyProjectListPatch(
  project: ProjectListItem,
  patch: ProjectPatch,
  workspaceUsers: WorkspaceUser[] = [],
): ProjectListItem {
  const next: ProjectListItem = { ...project };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined)
    next.description = patch.description ?? null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.priority !== undefined) next.priority = patch.priority ?? null;
  if (patch.startDate !== undefined) next.startDate = patch.startDate;
  if (patch.endDate !== undefined) next.endDate = patch.endDate;
  if (patch.managerId !== undefined) {
    next.manager = patch.managerId
      ? resolveListManager(patch.managerId, project, workspaceUsers)
      : null;
  }
  if (patch.memberIds !== undefined) {
    next.members = resolveListMembers(patch.memberIds, project, workspaceUsers);
  }
  return next;
}

function patchProjectListCache(
  old: ProjectListCache | undefined,
  projectId: number,
  patch: ProjectPatch,
  workspaceUsers: WorkspaceUser[],
): ProjectListCache | undefined {
  if (!old) return old;
  const mapRows = (rows: ProjectListItem[]): ProjectListItem[] =>
    rows.map((p) =>
      p.id === projectId ? applyProjectListPatch(p, patch, workspaceUsers) : p,
    );
  if ("pages" in old)
    return {
      ...old,
      pages: old.pages.map((page) => ({ ...page, data: mapRows(page.data) })),
    };
  if (!old.data) return old;
  return { ...old, data: mapRows(old.data) };
}

function applyProjectDetailPatch(
  project: ProjectWithDetails,
  patch: ProjectPatch,
): ProjectWithDetails {
  const next: ProjectWithDetails = { ...project };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined)
    next.description = patch.description ?? null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.startDate !== undefined) next.startDate = patch.startDate;
  if (patch.endDate !== undefined) next.endDate = patch.endDate;
  return next;
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
      apiClient.patch<ProjectWithDetails>(`/build/${projectId}`, data),
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
    UseMutationOptions<{ success: boolean }, Error, { projectId: number }>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { projectId: number }>({
    ...options,
    mutationKey: ["projects", "delete"],
    mutationFn: ({ projectId }) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}

export function useArchiveProject(
  options?: Omit<
    UseMutationOptions<
      { success: boolean },
      Error,
      { projectId: number; restore?: boolean }
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { projectId: number; restore?: boolean }
  >({
    ...options,
    mutationKey: ["projects", "archive"],
    mutationFn: ({ projectId, restore }) =>
      apiClient.patch<{ success: boolean }>(`/build/${projectId}`, {
        status: restore ? "ACTIVE" : "ARCHIVED",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}

export function useProjectMembers(
  projectId: number,
  options?: Omit<
    UseQueryOptions<ProjectMemberRecord[]>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  const canView = useCan("build:view");
  return useQuery<ProjectMemberRecord[]>({
    queryKey: buildWorkQueryKeys.projects.members(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectMemberRecord[]>(`/build/${projectId}/members`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useAddProjectMember(
  options?: Omit<
    UseMutationOptions<ProjectMember, Error, AddProjectMemberInput>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ProjectMember, Error, AddProjectMemberInput>("build:manage", {
    ...options,
    mutationKey: ["projects", "members", "add"],
    mutationFn: ({ projectId, ...data }: AddProjectMemberInput) =>
      apiClient.post<ProjectMember>(`/build/${projectId}/members`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.members(variables.projectId),
      });
    },
  });
}


type UpdateMemberRoleInput = {
  projectId: number;
  memberUserId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
};

export function useUpdateProjectMemberRole(
  options?: Omit<
    UseMutationOptions<
      { userId: string; role: string | null },
      Error,
      UpdateMemberRoleInput
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    { userId: string; role: string | null },
    Error,
    UpdateMemberRoleInput
  >({
    ...options,
    mutationKey: ["projects", "members", "update-role"],
    mutationFn: ({ projectId, memberUserId, role }) =>
      apiClient.patch<{ userId: string; role: string | null }>(
        `/build/${projectId}/members/${memberUserId}`,
        { role },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.members(variables.projectId),
      });
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
        ? apiClient.get<TicketLabel[]>(`/build/${projectId}/labels`, undefined, signal)
        : apiClient.get<TicketLabel[]>("/build/labels", undefined, signal),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
