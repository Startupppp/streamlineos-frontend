"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { Role } from "@/types/organization";
import type {
  AssignRoleMemberInput,
  RoleMember,
  RolePermissionGrant,
  SetRolePermissionsInput,
  UnassignRoleMemberInput,
} from "@/types/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface PaginatedRolesParams {
  cursor?: string;
  limit: number;
  search?: string;
}

export interface RoleListRow extends Role {
  permissionCount: number;
  memberCount: number;
}

export interface PaginatedRolesResponse {
  data: RoleListRow[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

const ROLE_SELECTOR_PARAMS = { limit: 100 } as const;

export const useRoles = (
  options?: Omit<UseQueryOptions<Role[], Error>, "queryKey" | "queryFn">
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<Role[], Error>({
    queryKey: queryKeys.roles.selectorList(),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedRolesResponse>(
        "/roles",
        ROLE_SELECTOR_PARAMS, signal,
      );
      return response.data;
    },
    staleTime: 30 * 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
};

export const usePaginatedRoles = (
  params: PaginatedRolesParams,
  options?: Omit<
    UseQueryOptions<PaginatedRolesResponse, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<PaginatedRolesResponse, Error>({
    queryKey: queryKeys.roles.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedRolesResponse>("/roles", {
        cursor: params.cursor,
        limit: params.limit,
        search: params.search,
      }, signal),
    staleTime: 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
};

export const useRole = (
  id: number,
  options?: Omit<
    UseQueryOptions<Role, Error>,
    "queryKey" | "queryFn"
  >
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<Role, Error>({
    queryKey: queryKeys.roles.detail(id),
    queryFn: ({ signal }) => apiClient.get<Role>(`/roles/${id}`, undefined, signal),
    staleTime: 30 * 60_000,
    ...options,
    enabled: canManage && id > 0 && (options?.enabled ?? true),
  });
};


export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("settings:rbac:manage", {
    mutationKey: ["roles", "delete"],
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
};

export const useUpdateRole = (roleId: number) => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, { name: string }>("settings:rbac:manage", {
    mutationKey: ["roles", "update", roleId],
    mutationFn: ({ name }) =>
      apiClient.patch<{ success: boolean }>(`/roles/${roleId}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.detail(roleId),
      });
    },
  });
};

export function useMaterializeRoleTemplate() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Role, Error, { templateId: string }>("settings:rbac:manage", {
    mutationKey: ["roles", "materialize-template"],
    mutationFn: (data) => apiClient.post<Role>("/roles/templates", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
  });
}

export interface RoleTemplate {
  id: string;
  name: string;
  slug: string;
  permissions: readonly string[];
}


export function useSeedDefaultRoles() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("settings:rbac:manage", {
    mutationKey: ["roles", "seed-defaults"],
    mutationFn: () =>
      apiClient.post<{ created: string[]; skipped: string[] }>("/roles/seed-defaults"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}


export const useRolePermissionGrants = (
  roleId: number,
  options?: Omit<
    UseQueryOptions<RolePermissionGrant[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<RolePermissionGrant[], Error>({
    queryKey: queryKeys.roles.permissions(roleId),
    queryFn: ({ signal }) =>
      apiClient.get<RolePermissionGrant[]>(`/roles/${roleId}/permissions`, undefined, signal),
    staleTime: 5 * 60_000,
    ...options,
    enabled: canManage && roleId > 0 && (options?.enabled ?? true),
  });
};

export const useSetRolePermissions = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true; version: number }, Error, SetRolePermissionsInput>("settings:rbac:manage", {
    mutationKey: ["roles", "set-permissions"],
    mutationFn: ({ roleId, version, items }) =>
      apiClient.put<{ success: true; version: number }>(`/roles/${roleId}/permissions`, { version, items }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<import("@/types/organization").Role>(
        queryKeys.roles.detail(variables.roleId),
        (old) => (old ? { ...old, version: data.version } : old),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(variables.roleId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
    },
  });
};

export const useRoleMembers = (
  roleId: number,
  options?: Omit<
    UseQueryOptions<RoleMember[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<RoleMember[], Error>({
    queryKey: queryKeys.roles.members(roleId),
    queryFn: ({ signal }) => apiClient.get<RoleMember[]>(`/roles/${roleId}/members`, undefined, signal),
    staleTime: 5 * 60_000,
    ...options,
    enabled: canManage && roleId > 0 && (options?.enabled ?? true),
  });
};

export const useAssignRoleMember = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, AssignRoleMemberInput>("settings:rbac:manage", {
    mutationKey: ["roles", "assign-member"],
    mutationFn: ({ roleId, ...body }) =>
      apiClient.post<{ success: boolean }>(`/roles/${roleId}/members`, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.members(variables.roleId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
    },
  });
};

export const useUnassignRoleMember = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, UnassignRoleMemberInput>("settings:rbac:manage", {
    mutationKey: ["roles", "unassign-member"],
    mutationFn: ({ roleId, ...body }) =>
      apiClient.delete<{ success: boolean }>(`/roles/${roleId}/members`, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.members(variables.roleId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
    },
  });
};

interface RolesAnalytics {
  totalRoles: number;
  customRoles: number;
  systemRoles: number;
  totalPermissions: number;
  usersAssigned: number;
  recentChanges: number;
}

export function useRolesAnalytics(
  options?: Omit<UseQueryOptions<RolesAnalytics, Error>, "queryKey" | "queryFn">
) {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<RolesAnalytics, Error>({
    queryKey: queryKeys.roles.analytics(),
    queryFn: ({ signal }) => apiClient.get<RolesAnalytics>("/roles/analytics", undefined, signal),
    staleTime: 2 * 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
}

export interface AssignableDepartment {
  id: number;
  name: string;
}

export function useAssignableDepartments(
  options?: Omit<UseQueryOptions<AssignableDepartment[], Error>, "queryKey" | "queryFn">
) {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<AssignableDepartment[], Error>({
    queryKey: queryKeys.roles.departments(),
    queryFn: ({ signal }) => apiClient.get<AssignableDepartment[]>("/roles/departments", undefined, signal),
    staleTime: 5 * 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
}
