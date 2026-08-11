"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export interface PrincipalGroup {
  id: string;
  name: string;
  kind: "ORG_UNIT" | "CUSTOM";
  orgUnitId: string | null;
  memberCount: number;
  roleCount: number;
  createdAt: string;
}

export interface GroupMember {
  membershipId: number;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface GroupRole {
  id: number;
  name: string;
  slug: string;
  rank: number;
  moduleKey: string | null;
}

export interface PaginatedGroupsResponse {
  data: PrincipalGroup[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListGroupsParams {
  page: number;
  limit: number;
}

export function usePrincipalGroups(
  params: ListGroupsParams,
  options?: Omit<UseQueryOptions<PaginatedGroupsResponse, Error>, "queryKey" | "queryFn">,
) {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<PaginatedGroupsResponse, Error>({
    queryKey: queryKeys.principalGroups.list(params),
    queryFn: () =>
      apiClient.get<PaginatedGroupsResponse>("/principal-groups", {
        page: params.page,
        limit: params.limit,
      }),
    staleTime: 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
}

export function useGroupMembers(
  groupId: string,
  options?: Omit<UseQueryOptions<GroupMember[], Error>, "queryKey" | "queryFn">,
) {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<GroupMember[], Error>({
    queryKey: queryKeys.principalGroups.members(groupId),
    queryFn: () => apiClient.get<GroupMember[]>(`/principal-groups/${groupId}/members`),
    staleTime: 60_000,
    ...options,
    enabled: canManage && !!groupId && (options?.enabled ?? true),
  });
}

export function useGroupRoles(
  groupId: string,
  options?: Omit<UseQueryOptions<GroupRole[], Error>, "queryKey" | "queryFn">,
) {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<GroupRole[], Error>({
    queryKey: queryKeys.principalGroups.roles(groupId),
    queryFn: () => apiClient.get<GroupRole[]>(`/principal-groups/${groupId}/roles`),
    staleTime: 60_000,
    ...options,
    enabled: canManage && !!groupId && (options?.enabled ?? true),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation<PrincipalGroup, Error, { name: string }>({
    mutationKey: ["principalGroups", "create"],
    mutationFn: (data) => apiClient.post<PrincipalGroup>("/principal-groups", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalGroups.all });
    },
  });
}

export function useRenameGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { name: string }>({
    mutationKey: ["principalGroups", "rename", groupId],
    mutationFn: (data) =>
      apiClient.patch<{ success: true }>(`/principal-groups/${groupId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalGroups.all });
    },
  });
}

export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { membershipId: number }>({
    mutationKey: ["principalGroups", "add-member", groupId],
    mutationFn: (data) =>
      apiClient.post<{ success: true }>(`/principal-groups/${groupId}/members`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.principalGroups.members(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalGroups.list() });
    },
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { membershipId: number }>({
    mutationKey: ["principalGroups", "remove-member", groupId],
    mutationFn: ({ membershipId }) =>
      apiClient.delete<{ success: true }>(
        `/principal-groups/${groupId}/members/${membershipId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.principalGroups.members(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalGroups.list() });
    },
  });
}

export function useAssignGroupRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { roleId: number }>({
    mutationKey: ["principalGroups", "assign-role", groupId],
    mutationFn: (data) =>
      apiClient.post<{ success: true }>(`/principal-groups/${groupId}/roles`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.principalGroups.roles(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalGroups.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
    },
  });
}

export function useUnassignGroupRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { roleId: number }>({
    mutationKey: ["principalGroups", "unassign-role", groupId],
    mutationFn: ({ roleId }) =>
      apiClient.delete<{ success: true }>(
        `/principal-groups/${groupId}/roles/${roleId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.principalGroups.roles(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalGroups.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
    },
  });
}
