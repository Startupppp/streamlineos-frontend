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

export const useRoles = (
  options?: Omit<UseQueryOptions<Role[], Error>, "queryKey" | "queryFn">
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<Role[], Error>({
    queryKey: queryKeys.roles.list(),
    queryFn: () => apiClient.get<Role[]>("/roles"),
    staleTime: 30 * 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
};

export const useRole = (
  id: number,
  options?: Omit<
    UseQueryOptions<Role, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<Role, Error>({
    queryKey: queryKeys.roles.detail(id),
    queryFn: () => apiClient.get<Role>(`/roles/${id}`),
    enabled: id > 0,
    staleTime: 30 * 60_000,
    ...options,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    Role,
    Error,
    { name: string; slug: string; permissions?: string[] }
  >({
    mutationKey: ["roles", "create"],
    mutationFn: (data) => apiClient.post<Role>("/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
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
  return useMutation<{ success: boolean }, Error, { name: string }>({
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

export interface RoleTemplate {
  id: string;
  name: string;
  slug: string;
  permissions: readonly string[];
}

export function useRoleTemplates() {
  return useQuery<RoleTemplate[], Error>({
    queryKey: [...queryKeys.roles.all, "templates"] as const,
    queryFn: () => apiClient.get<RoleTemplate[]>("/roles/templates"),
    staleTime: 10 * 60_000,
  });
}

export function useSeedDefaultRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["roles", "seed-defaults"],
    mutationFn: () =>
      apiClient.post<{ created: string[]; skipped: string[] }>("/roles/seed-defaults"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useCloneRoleTemplate() {
  const queryClient = useQueryClient();
  return useMutation<Role, Error, { templateId: string; name?: string; slug?: string }>({
    mutationKey: ["roles", "clone-template"],
    mutationFn: (data) => apiClient.post<Role>("/roles/templates", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
  });
}

export const useRolePermissionGrants = (
  roleId: number,
  options?: Omit<
    UseQueryOptions<RolePermissionGrant[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<RolePermissionGrant[], Error>({
    queryKey: queryKeys.roles.permissions(roleId),
    queryFn: () =>
      apiClient.get<RolePermissionGrant[]>(`/roles/${roleId}/permissions`),
    enabled: roleId > 0,
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useSetRolePermissions = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, SetRolePermissionsInput>({
    mutationKey: ["roles", "set-permissions"],
    mutationFn: ({ roleId, items }) =>
      apiClient.put<{ success: boolean }>(`/roles/${roleId}/permissions`, { items }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(variables.roleId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.detail(variables.roleId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissionsMatrix() });
    },
  });
};

export const useRoleMembers = (
  roleId: number,
  options?: Omit<
    UseQueryOptions<RoleMember[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<RoleMember[], Error>({
    queryKey: queryKeys.roles.members(roleId),
    queryFn: () => apiClient.get<RoleMember[]>(`/roles/${roleId}/members`),
    enabled: roleId > 0,
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useAssignRoleMember = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, AssignRoleMemberInput>({
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
  return useMutation<{ success: boolean }, Error, UnassignRoleMemberInput>({
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

export interface RolePermissionsMatrixEntry {
  roleId: number;
  roleName: string;
  roleSlug: string;
  permissions: string[];
}

export function useRolePermissionsMatrix(
  options?: Omit<UseQueryOptions<RolePermissionsMatrixEntry[], Error>, "queryKey" | "queryFn">
) {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<RolePermissionsMatrixEntry[], Error>({
    queryKey: queryKeys.roles.permissionsMatrix(),
    queryFn: () => apiClient.get<RolePermissionsMatrixEntry[]>("/roles/permissions/matrix"),
    staleTime: 5 * 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
}

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
    queryFn: () => apiClient.get<RolesAnalytics>("/roles/analytics"),
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
  return useQuery<AssignableDepartment[], Error>({
    queryKey: queryKeys.roles.departments(),
    queryFn: () => apiClient.get<AssignableDepartment[]>("/roles/departments"),
    staleTime: 5 * 60_000,
    ...options,
  });
}
