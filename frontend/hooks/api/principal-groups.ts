"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  principalGroupMembersContract,
  principalGroupPageContract,
  principalGroupRolesContract,
  principalGroupSuccessContract,
  principalGroupContract,
} from "@/hooks/api/principal-groups-schema";
import type {
  GroupMember,
  GroupRole,
  PaginatedGroupsResponse,
  PrincipalGroup,
} from "@/hooks/api/principal-groups-schema";

export type {
  GroupMember,
  GroupRole,
  PaginatedGroupsResponse,
  PrincipalGroup,
} from "@/hooks/api/principal-groups-schema";

export interface ListGroupsParams {
  cursor?: string;
  limit: number;
}

export function usePrincipalGroups(
  params: ListGroupsParams,
  options?: Omit<UseQueryOptions<PaginatedGroupsResponse, Error>, "queryKey" | "queryFn">,
) {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<PaginatedGroupsResponse, Error>({
    queryKey: accessAndCrmQueryKeys.principalGroups.list(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/principal-groups",
        { cursor: params.cursor, limit: params.limit },
        signal,
        principalGroupPageContract,
      ),
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
    queryKey: accessAndCrmQueryKeys.principalGroups.members(groupId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/principal-groups/${groupId}/members`,
        undefined,
        signal,
        principalGroupMembersContract,
      ),
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
    queryKey: accessAndCrmQueryKeys.principalGroups.roles(groupId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/principal-groups/${groupId}/roles`,
        undefined,
        signal,
        principalGroupRolesContract,
      ),
    staleTime: 60_000,
    ...options,
    enabled: canManage && !!groupId && (options?.enabled ?? true),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PrincipalGroup, Error, { name: string }>("settings:rbac:manage", {
    mutationKey: ["principalGroups", "create"],
    mutationFn: (data) => apiClient.post<PrincipalGroup>("/principal-groups", data, principalGroupContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.principalGroups.all });
    },
  });
}

export function useRenameGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true }, Error, { name: string }>("settings:rbac:manage", {
    mutationKey: ["principalGroups", "rename", groupId],
    mutationFn: (data) =>
      apiClient.patch<{ success: true }>(`/principal-groups/${groupId}`, data, principalGroupSuccessContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.principalGroups.all });
    },
  });
}

export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true }, Error, { membershipId: number }>("settings:rbac:manage", {
    mutationKey: ["principalGroups", "add-member", groupId],
    mutationFn: (data) =>
      apiClient.post<{ success: true }>(`/principal-groups/${groupId}/members`, data, principalGroupSuccessContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.principalGroups.members(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.principalGroups.list() });
    },
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true }, Error, { membershipId: number }>("settings:rbac:manage", {
    mutationKey: ["principalGroups", "remove-member", groupId],
    mutationFn: ({ membershipId }) =>
      apiClient.delete<{ success: true }>(
        `/principal-groups/${groupId}/members/${membershipId}`,
        undefined, undefined, principalGroupSuccessContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.principalGroups.members(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.principalGroups.list() });
    },
  });
}

export function useAssignGroupRole(groupId: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true }, Error, { roleId: number }>("settings:rbac:manage", {
    mutationKey: ["principalGroups", "assign-role", groupId],
    mutationFn: (data) =>
      apiClient.post<{ success: true }>(`/principal-groups/${groupId}/roles`, data, principalGroupSuccessContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.principalGroups.roles(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.principalGroups.list() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    },
  });
}

export function useUnassignGroupRole(groupId: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true }, Error, { roleId: number }>("settings:rbac:manage", {
    mutationKey: ["principalGroups", "unassign-role", groupId],
    mutationFn: ({ roleId }) =>
      apiClient.delete<{ success: true }>(
        `/principal-groups/${groupId}/roles/${roleId}`,
        undefined, undefined, principalGroupSuccessContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.principalGroups.roles(groupId),
      });
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.principalGroups.list() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    },
  });
}
