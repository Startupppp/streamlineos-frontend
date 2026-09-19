"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  PmWorkspace,
  PmWorkspacesPage,
  CreatePmWorkspaceInput,
  UpdatePmWorkspaceInput,
  PmWorkspaceMember,
  PmWorkspaceMembersPage,
  AddPmWorkspaceMemberInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


const pmWorkspacePageContract = lazyContract(() =>
  import("@/hooks/api/build/pm-workspaces-schema").then((m) => m.pmWorkspacePageContract),
);
const pmWorkspaceRowContract = lazyContract(() =>
  import("@/hooks/api/build/pm-workspaces-schema").then((m) => m.pmWorkspaceRowContract),
);
const pmWorkspaceMemberPageContract = lazyContract(() =>
  import("@/hooks/api/build/pm-workspaces-schema").then((m) => m.pmWorkspaceMemberPageContract),
);
const pmWorkspaceMemberRowContract = lazyContract(() =>
  import("@/hooks/api/build/pm-workspaces-schema").then((m) => m.pmWorkspaceMemberRowContract),
);
const pmWorkspacesSuccessContract = lazyContract(() =>
  import("@/hooks/api/build/pm-workspaces-schema").then((m) => m.pmWorkspacesSuccessContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface ListPmWorkspacesParams {
  cursor?: string;
  limit?: number;
  status?: string;
  search?: string;
}

export function usePmWorkspaces(params?: ListPmWorkspacesParams) {
  const canView = useCan("build:workspaces:view");
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams["cursor"] = params.cursor;
  if (params?.status) queryParams["status"] = params.status;
  if (params?.search) queryParams["search"] = params.search;
  if (params?.limit) queryParams["limit"] = String(params.limit);

  return useQuery<PmWorkspacesPage>({
    queryKey: buildWorkQueryKeys.projects.pmWorkspaces.list(
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<PmWorkspacesPage>("/build/workspaces", queryParams, signal, pmWorkspacePageContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function usePmWorkspace(pmWorkspaceId: string | null) {
  const canView = useCan("build:workspaces:view");
  return useQuery<PmWorkspace>({
    queryKey: buildWorkQueryKeys.projects.pmWorkspaces.detail(
      pmWorkspaceId ?? "",
    ),
    queryFn: ({ signal }) =>
      apiClient.get<PmWorkspace>(
        `/build/workspaces/${pmWorkspaceId}`,
        undefined,
        signal,
        pmWorkspaceRowContract,
      ),
    enabled: canView && !!pmWorkspaceId,
    staleTime: 60_000,
  });
}

export function useCreatePmWorkspace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:create", {
    mutationKey: ["projects", "pm-workspaces", "create"],
    mutationFn: (data: CreatePmWorkspaceInput) =>
      apiClient.post<PmWorkspace>("/build/workspaces", data, undefined, pmWorkspaceRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.pmWorkspaces.list() });
    },
  });
}

export function useUpdatePmWorkspace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:update", {
    mutationKey: ["projects", "pm-workspaces", "update"],
    mutationFn: ({
      pmWorkspaceId,
      ...data
    }: UpdatePmWorkspaceInput & { pmWorkspaceId: string }) =>
      apiClient.patch<PmWorkspace>(`/build/workspaces/${pmWorkspaceId}`, data, undefined, pmWorkspaceRowContract),
    onSuccess: (updated, vars) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.pmWorkspaces.detail(vars.pmWorkspaceId),
        updated,
      );
      const loadedPages = qc.getQueriesData<PmWorkspacesPage>({
        queryKey: buildWorkQueryKeys.projects.pmWorkspaces.list(),
      });
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        if (!page.data.some((row) => row.pmWorkspaceId === vars.pmWorkspaceId))
          continue;
        qc.setQueryData<PmWorkspacesPage>(key, {
          ...page,
          data: page.data.map((row) =>
            row.pmWorkspaceId === vars.pmWorkspaceId ? updated : row,
          ),
        });
      }
    },
  });
}

export function useDeletePmWorkspace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:delete", {
    mutationKey: ["projects", "pm-workspaces", "delete"],
    mutationFn: (pmWorkspaceId: string) =>
      apiClient.delete<void>(`/build/workspaces/${pmWorkspaceId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.pmWorkspaces.list() });
    },
  });
}

interface ListMembersParams {
  cursor?: string;
  limit?: number;
}

export function usePmWorkspaceMembers(
  pmWorkspaceId: string | null,
  params?: ListMembersParams,
) {
  const canView = useCan("build:workspaces:members:view");
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams["cursor"] = params.cursor;
  if (params?.limit) queryParams["limit"] = String(params.limit);

  return useQuery<PmWorkspaceMembersPage>({
    queryKey: buildWorkQueryKeys.projects.pmWorkspaces.members(
      pmWorkspaceId ?? "",
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<PmWorkspaceMembersPage>(`/build/workspaces/${pmWorkspaceId}/members`, queryParams, signal, pmWorkspaceMemberPageContract),
    enabled: canView && !!pmWorkspaceId,
    staleTime: 60_000,
  });
}

export function useAddPmWorkspaceMember(pmWorkspaceId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:members:manage", {
    mutationKey: ["projects", "pm-workspaces", "members", "add"],
    mutationFn: (data: AddPmWorkspaceMemberInput) =>
      apiClient.post<PmWorkspaceMember>(`/build/workspaces/${pmWorkspaceId}/members`, data, undefined, pmWorkspaceMemberRowContract),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.pmWorkspaces.members(pmWorkspaceId),
      });
    },
  });
}

export function useRemovePmWorkspaceMember(pmWorkspaceId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:members:manage", {
    mutationKey: ["projects", "pm-workspaces", "members", "remove"],
    mutationFn: (pmWorkspaceMembershipId: string) =>
      apiClient.delete<{ success: true }>(
        `/build/workspaces/${pmWorkspaceId}/members/${pmWorkspaceMembershipId}`,
        undefined,
        undefined,
        pmWorkspacesSuccessContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.pmWorkspaces.members(pmWorkspaceId),
      });
    },
  });
}
