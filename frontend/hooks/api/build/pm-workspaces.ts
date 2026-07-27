"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

const BASE = "/product-management/workspaces";

interface ListPmWorkspacesParams {
  page?: number;
  limit?: number;
  status?: string;
}

export function usePmWorkspaces(params?: ListPmWorkspacesParams) {
  const canView = useCan("build:workspaces:view");
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams["page"] = String(params.page);
  if (params?.limit) queryParams["limit"] = String(params.limit);
  if (params?.status) queryParams["status"] = params.status;

  return useQuery<PmWorkspacesPage>({
    queryKey: queryKeys.projects.pmWorkspaces.list(
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    queryFn: () => apiClient.get<PmWorkspacesPage>(BASE, queryParams),
    enabled: canView && (params?.page === undefined || params.page > 0),
    staleTime: 60_000,
  });
}

export function usePmWorkspace(pmWorkspaceId: string) {
  const canView = useCan("build:workspaces:view");
  return useQuery<PmWorkspace>({
    queryKey: queryKeys.projects.pmWorkspaces.detail(pmWorkspaceId),
    queryFn: () => apiClient.get<PmWorkspace>(`${BASE}/${pmWorkspaceId}`),
    enabled: canView && !!pmWorkspaceId,
    staleTime: 60_000,
  });
}

export function useCreatePmWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "pm-workspaces", "create"],
    mutationFn: (data: CreatePmWorkspaceInput) =>
      apiClient.post<PmWorkspace>(BASE, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.pmWorkspaces.list() });
    },
  });
}

export function useUpdatePmWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "pm-workspaces", "update"],
    mutationFn: ({
      pmWorkspaceId,
      ...data
    }: UpdatePmWorkspaceInput & { pmWorkspaceId: string }) =>
      apiClient.patch<PmWorkspace>(`${BASE}/${pmWorkspaceId}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.pmWorkspaces.list() });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.pmWorkspaces.detail(vars.pmWorkspaceId),
      });
    },
  });
}

export function useDeletePmWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "pm-workspaces", "delete"],
    mutationFn: (pmWorkspaceId: string) =>
      apiClient.delete<void>(`${BASE}/${pmWorkspaceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.pmWorkspaces.list() });
    },
  });
}

interface ListMembersParams {
  page?: number;
  limit?: number;
}

export function usePmWorkspaceMembers(
  pmWorkspaceId: string | null,
  params?: ListMembersParams,
) {
  const canView = useCan("build:workspaces:members:view");
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams["page"] = String(params.page);
  if (params?.limit) queryParams["limit"] = String(params.limit);

  return useQuery<PmWorkspaceMembersPage>({
    queryKey: queryKeys.projects.pmWorkspaces.members(
      pmWorkspaceId ?? "",
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    queryFn: () =>
      apiClient.get<PmWorkspaceMembersPage>(
        `${BASE}/${pmWorkspaceId}/members`,
        queryParams,
      ),
    enabled: canView && !!pmWorkspaceId,
    staleTime: 60_000,
  });
}

export function useAddPmWorkspaceMember(pmWorkspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "pm-workspaces", "members", "add"],
    mutationFn: (data: AddPmWorkspaceMemberInput) =>
      apiClient.post<PmWorkspaceMember>(`${BASE}/${pmWorkspaceId}/members`, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.pmWorkspaces.members(pmWorkspaceId),
      });
    },
  });
}

export function useRemovePmWorkspaceMember(pmWorkspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "pm-workspaces", "members", "remove"],
    mutationFn: (pmWorkspaceMembershipId: string) =>
      apiClient.delete<{ success: true }>(
        `${BASE}/${pmWorkspaceId}/members/${pmWorkspaceMembershipId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.pmWorkspaces.members(pmWorkspaceId),
      });
    },
  });
}
