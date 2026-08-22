"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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

export interface ModuleRoleGroup {
  id: number;
  name: string;
  isSystem: boolean;
  version: number;
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

export interface ModuleMemberGroup {
  id: number;
  name: string;
}

export interface ModuleMember {
  membershipId: number;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  groups: ModuleMemberGroup[];
}

export interface MemberGrant {
  permissionKey: string;
  scope: DataScope;
  reason: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface AuditLogEntry {
  id: string | number;
  action: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  targetId: string | null;
  targetType: string | null;
  targetName: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ModuleMyPermissions {
  permissions: Array<{ key: string; scope: DataScope }>;
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  isModuleOwner: boolean;
  isModuleAdmin: boolean;
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
        exact: true,
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
        exact: true,
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
        exact: true,
      });
    },
  });
}

export function useSetModuleGroupPermissions(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: true; version: number },
    Error,
    { groupId: number; version: number; items: { permissionKey: string; scope: DataScope }[] }
  >({
    mutationKey: ["moduleAccess", moduleKey, "set-group-permissions"],
    mutationFn: ({ groupId, version, items }) =>
      apiClient.put<{ success: true; version: number }>(
        `/module-access/${moduleKey}/groups/${groupId}/permissions`,
        { version, items },
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<ModuleRoleGroup[]>(
        queryKeys.moduleAccess.roleGroups(moduleKey),
        (old) =>
          old?.map((g) =>
            g.id === variables.groupId ? { ...g, version: data.version } : g,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.access.me(),
        exact: true,
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
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { groupId: number; userId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "add-member"],
    mutationFn: ({ groupId, userId }) =>
      apiClient.post<{ success: true }>(
        `/module-access/${moduleKey}/groups/${groupId}/members`,
        { userId },
      ),
    onSuccess: (_, { groupId, userId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.access.me(),
          exact: true,
        });
      }
    },
  });
}

export function useRemoveModuleGroupMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
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
    onSuccess: (_, { groupId, userId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.access.me(),
          exact: true,
        });
      }
    },
  });
}

export function useModuleMemberCandidates(
  moduleKey: string,
  page: number,
  pageSize: number,
  search: string,
  options?: { enabled?: boolean; userId?: string; excludeAssigned?: boolean },
) {
  const canManage = useCan(manageKey(moduleKey));
  const userId = options?.userId;
  const excludeAssigned = options?.excludeAssigned ?? true;
  return useQuery<PaginatedResult<ModuleMemberCandidate>, Error>({
    queryKey: queryKeys.moduleAccess.memberCandidates(moduleKey, {
      page,
      pageSize,
      search,
      userId,
      excludeAssigned,
    }),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);
      if (userId) params.set("userId", userId);
      params.set("excludeAssigned", String(excludeAssigned));
      return apiClient.get<PaginatedResult<ModuleMemberCandidate>>(
        `/module-access/${moduleKey}/member-candidates?${params.toString()}`,
      );
    },
    enabled: canManage && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
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

export function useModuleMyPermissions(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleMyPermissions, Error>({
    queryKey: queryKeys.moduleAccess.myPermissions(moduleKey),
    queryFn: () =>
      apiClient.get<ModuleMyPermissions>(
        `/module-access/${moduleKey}/me/permissions`,
      ),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useModuleMembers(
  moduleKey: string,
  page: number,
  pageSize: number,
  options?: { enabled?: boolean; userId?: string },
) {
  const canView = useCan(viewKey(moduleKey));
  const userId = options?.userId;
  return useQuery<PaginatedResult<ModuleMember>, Error>({
    queryKey: queryKeys.moduleAccess.members(moduleKey, { page, pageSize, userId }),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (userId !== undefined) params.set("userId", userId);
      return apiClient.get<PaginatedResult<ModuleMember>>(
        `/module-access/${moduleKey}/members?${params.toString()}`,
      );
    },
    enabled: canView && (options?.enabled ?? true),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAddModuleMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { userId: string; groupIds: number[] }>({
    mutationKey: ["moduleAccess", moduleKey, "add-module-member"],
    mutationFn: (body) =>
      apiClient.post<{ success: true }>(
        `/module-access/${moduleKey}/members`,
        body,
      ),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.access.me(),
          exact: true,
        });
      }
    },
  });
}

export function useUpdateModuleMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { userId: string; groupIds: number[] }>({
    mutationKey: ["moduleAccess", moduleKey, "update-module-member"],
    mutationFn: ({ userId, groupIds }) =>
      apiClient.patch<{ success: true }>(
        `/module-access/${moduleKey}/members/${userId}`,
        { groupIds },
      ),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.access.me(),
          exact: true,
        });
      }
    },
  });
}

export function useRemoveModuleMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { userId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "remove-module-member"],
    mutationFn: ({ userId }) =>
      apiClient.delete<{ success: true }>(
        `/module-access/${moduleKey}/members/${userId}`,
      ),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.access.me(),
          exact: true,
        });
      }
    },
  });
}

export function useModuleAuditLog(
  moduleKey: string,
  page: number,
  pageSize: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<PaginatedResult<AuditLogEntry>, Error>({
    queryKey: queryKeys.moduleAccess.auditLog(moduleKey, { page, pageSize }),
    queryFn: () =>
      apiClient.get<PaginatedResult<AuditLogEntry>>(
        `/module-access/${moduleKey}/audit-log?page=${page}&pageSize=${pageSize}`,
      ),
    enabled: canView && (options?.enabled ?? true),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useModuleMemberGrants(
  moduleKey: string,
  membershipId: number | null,
  options?: { enabled?: boolean },
) {
  const canManage = useCan(manageKey(moduleKey));
  return useQuery<{ grants: MemberGrant[] }, Error>({
    queryKey: queryKeys.moduleAccess.memberGrants(moduleKey, membershipId ?? 0),
    queryFn: () =>
      apiClient.get<{ grants: MemberGrant[] }>(
        `/module-access/${moduleKey}/members/${membershipId}/grants`,
      ),
    enabled: canManage && membershipId !== null && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useSetModuleMemberGrants(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: true; granted: number },
    Error,
    {
      membershipId: number;
      items: { permissionKey: string; scope?: DataScope }[];
      reason?: string;
    }
  >({
    mutationKey: ["moduleAccess", moduleKey, "set-member-grants"],
    mutationFn: ({ membershipId, items, reason }) =>
      apiClient.put<{ success: true; granted: number }>(
        `/module-access/${moduleKey}/members/${membershipId}/grants`,
        { items, reason },
      ),
    onSuccess: (_, { membershipId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberGrants(moduleKey, membershipId),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.access.me(),
      });
    },
  });
}

