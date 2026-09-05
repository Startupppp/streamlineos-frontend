"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
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

const BASE = "/build/workspaces";

interface ListPmWorkspacesParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export function usePmWorkspaces(params?: ListPmWorkspacesParams) {
  const canView = useCan("build:workspaces:view");
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams["cursor"] = params.cursor;
  if (params?.limit) queryParams["limit"] = String(params.limit);
  if (params?.status) queryParams["status"] = params.status;

  return useQuery<PmWorkspacesPage>({
    queryKey: buildWorkQueryKeys.projects.pmWorkspaces.list(
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<PmWorkspacesPage>(BASE, queryParams, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreatePmWorkspace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:create", {
    mutationKey: ["projects", "pm-workspaces", "create"],
    mutationFn: (data: CreatePmWorkspaceInput) =>
      apiClient.post<PmWorkspace>(BASE, data),
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
      apiClient.patch<PmWorkspace>(`${BASE}/${pmWorkspaceId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.pmWorkspaces.list() });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.pmWorkspaces.detail(vars.pmWorkspaceId),
      });
    },
  });
}

export function useDeletePmWorkspace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:delete", {
    mutationKey: ["projects", "pm-workspaces", "delete"],
    mutationFn: (pmWorkspaceId: string) =>
      apiClient.delete<void>(`${BASE}/${pmWorkspaceId}`),
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
      apiClient.get<PmWorkspaceMembersPage>(
        `${BASE}/${pmWorkspaceId}/members`,
        queryParams, signal,
      ),
    enabled: canView && !!pmWorkspaceId,
    staleTime: 60_000,
  });
}

export function useAddPmWorkspaceMember(pmWorkspaceId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspaces:members:manage", {
    mutationKey: ["projects", "pm-workspaces", "members", "add"],
    mutationFn: (data: AddPmWorkspaceMemberInput) =>
      apiClient.post<PmWorkspaceMember>(`${BASE}/${pmWorkspaceId}/members`, data),
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
        `${BASE}/${pmWorkspaceId}/members/${pmWorkspaceMembershipId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.pmWorkspaces.members(pmWorkspaceId),
      });
    },
  });
}
