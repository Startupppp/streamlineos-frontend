"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

export type DataScope = "all" | "team" | "own" | "none";

export interface ModulePermission {
  name: string;
  resource: string;
  action: string;
  description: string;
  scopable?: boolean;
}

export interface ModuleRolePermission {
  permissionKey: string;
  scope: DataScope;
}

export interface ModuleRoleView {
  roleId: number;
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: ModuleRolePermission[];
}

export interface ModuleRoleGroup {
  id: number;
  name: string;
  isSystem: boolean;
  memberCount: number;
  permissions: ModuleRolePermission[];
}

export interface ModuleGroupMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ModuleMemberCandidate {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ModuleOwnership {
  moduleKey: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerEmail: string;
  pendingTransfer?: {
    transferId: string;
    toUserId: string;
    toDisplayName: string;
    toEmail: string;
    initiatedAt: string;
  } | null;
}

function viewKey(mk: string): PermissionKey {
  return `${mk}:access:view` as PermissionKey;
}

function manageKey(mk: string): PermissionKey {
  return `${mk}:access:manage` as PermissionKey;
}

export function useModuleAccessCatalog(
  moduleKey: string,
  options?: { enabled?: boolean },
) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModulePermission[], Error>({
    queryKey: queryKeys.moduleAccess.catalog(moduleKey),
    queryFn: () =>
      apiClient.get<ModulePermission[]>(`/module-access/${moduleKey}/catalog`),
    enabled: canView && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
  });
}

export function useModuleAccessRoles(
  moduleKey: string,
  options?: { enabled?: boolean },
) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleRoleView[], Error>({
    queryKey: queryKeys.moduleAccess.roles(moduleKey),
    queryFn: () =>
      apiClient.get<ModuleRoleView[]>(`/module-access/${moduleKey}/roles`),
    enabled: canView && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
  });
}

export function useModuleRoleGroups(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleRoleGroup[], Error>({
    queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
    queryFn: () =>
      apiClient.get<ModuleRoleGroup[]>(`/module-access/${moduleKey}/groups`),
    enabled: canView,
    staleTime: 2 * 60_000,
  });
}

export function useCreateModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<ModuleRoleGroup, Error, { name: string }>({
    mutationKey: ["moduleAccess", moduleKey, "create-group"],
    mutationFn: (body) =>
      apiClient.post<ModuleRoleGroup>(
        `/module-access/${moduleKey}/groups`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
      });
    },
  });
}

export function useRenameModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<ModuleRoleGroup, Error, { id: number; name: string }>({
    mutationKey: ["moduleAccess", moduleKey, "rename-group"],
    mutationFn: ({ id, name }) =>
      apiClient.patch<ModuleRoleGroup>(
        `/module-access/${moduleKey}/groups/${id}`,
        { name },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
      });
    },
  });
}

export function useDeleteModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, number>({
    mutationKey: ["moduleAccess", moduleKey, "delete-group"],
    mutationFn: (id) =>
      apiClient.delete<{ success: true }>(
        `/module-access/${moduleKey}/groups/${id}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
      });
    },
  });
}

export function useSetModuleGroupPermissions(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: true },
    Error,
    { groupId: number; items: { permissionKey: string; scope: DataScope }[] }
  >({
    mutationKey: ["moduleAccess", moduleKey, "set-group-permissions"],
    mutationFn: ({ groupId, items }) =>
      apiClient.put<{ success: true }>(
        `/module-access/${moduleKey}/groups/${groupId}/permissions`,
        { items },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
    },
  });
}

export function useSetModuleRolePermissions(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: true },
    Error,
    { roleId: number; items: { permissionKey: string; scope: DataScope }[] }
  >({
    mutationKey: ["moduleAccess", moduleKey, "set-permissions"],
    mutationFn: ({ roleId, items }) =>
      apiClient.put<{ success: true }>(
        `/module-access/${moduleKey}/roles/${roleId}/permissions`,
        { items },
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roles(moduleKey),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, variables.roleId],
      });
    },
  });
}

export function useModuleGroupMembers(
  moduleKey: string,
  groupId: number | null,
) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleGroupMember[], Error>({
    queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId ?? 0),
    queryFn: () =>
      apiClient.get<ModuleGroupMember[]>(
        `/module-access/${moduleKey}/groups/${groupId}/members`,
      ),
    enabled: canView && groupId !== null,
    staleTime: 2 * 60_000,
  });
}

export function useAddModuleGroupMember(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { groupId: number; userId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "add-member"],
    mutationFn: ({ groupId, userId }) =>
      apiClient.post<{ success: true }>(
        `/module-access/${moduleKey}/groups/${groupId}/members`,
        { userId },
      ),
    onSuccess: (_data, { groupId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
      });
    },
  });
}

export function useRemoveModuleGroupMember(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: true },
    Error,
    { groupId: number; userId: string }
  >({
    mutationKey: ["moduleAccess", moduleKey, "remove-member"],
    mutationFn: ({ groupId, userId }) =>
      apiClient.delete<{ success: true }>(
        `/module-access/${moduleKey}/groups/${groupId}/members/${userId}`,
      ),
    onSuccess: (_data, { groupId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
      });
    },
  });
}

export function useModuleMemberCandidates(moduleKey: string) {
  const canManage = useCan(manageKey(moduleKey));
  return useQuery<ModuleMemberCandidate[], Error>({
    queryKey: queryKeys.moduleAccess.memberCandidates(moduleKey),
    queryFn: () =>
      apiClient.get<ModuleMemberCandidate[]>(
        `/module-access/${moduleKey}/member-candidates`,
      ),
    enabled: canManage,
    staleTime: 5 * 60_000,
  });
}

export function useModuleOwnership(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleOwnership, Error>({
    queryKey: queryKeys.moduleAccess.ownership(moduleKey),
    queryFn: () =>
      apiClient.get<ModuleOwnership>(`/module-access/${moduleKey}/ownership`),
    enabled: canView,
    staleTime: 2 * 60_000,
  });
}

export function useTransferModuleOwnership(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { toUserId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "transfer-ownership"],
    mutationFn: (body) =>
      apiClient.post<{ success: true }>(
        `/module-access/${moduleKey}/ownership/transfer`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.ownership(moduleKey),
      });
    },
  });
}

export function useCancelModuleOwnershipTransfer(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, void>({
    mutationKey: ["moduleAccess", moduleKey, "cancel-transfer"],
    mutationFn: () =>
      apiClient.delete<{ success: true }>(
        `/module-access/${moduleKey}/ownership/transfer`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.ownership(moduleKey),
      });
    },
  });
}
