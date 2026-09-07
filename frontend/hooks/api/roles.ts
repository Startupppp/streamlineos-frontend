"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
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
import { lazyContract } from "@/lib/api-envelope";
import type {
  Role as RoleRecordType,
  RoleListItem,
} from "@/hooks/api/roles-schema";

/**
 * Deferred: `hooks/api/index.ts` re-exports this module, and `roles-schema`
 * (plus the `cursor-page-schema` it builds on) is a value import of Zod. Role
 * administration is a small corner of the app; every barrel consumer was paying
 * for it. The contracts still reach `apiClient.get`, so parsing is unchanged.
 */
const rolesPageContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.rolesPageContract),
);
const roleContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.roleContract),
);
const roleSuccessContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.roleSuccessContract),
);
const setRolePermissionsContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.setRolePermissionsContract),
);
const seedDefaultRolesContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.seedDefaultRolesContract),
);
const rolePermissionGrantsContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.rolePermissionGrantsContract),
);
const roleMembersContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.roleMembersContract),
);
const rolesAnalyticsContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.rolesAnalyticsContract),
);
const assignableDepartmentsContract = lazyContract(() =>
  import("@/hooks/api/roles-schema").then((m) => m.assignableDepartmentsContract),
);

type RolesPage = {
  data: RoleListItem[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

export interface PaginatedRolesParams {
  cursor?: string;
  limit: number;
  search?: string;
}

export type {
  RoleListItem as RoleListRow,
  Role as RoleRecord,
} from "@/hooks/api/roles-schema";
export type PaginatedRolesResponse = RolesPage;

const ROLE_SELECTOR_PARAMS = { limit: 100 } as const;

export const useRoles = (
  options?: Omit<UseQueryOptions<RoleListItem[], Error>, "queryKey" | "queryFn">
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<RoleListItem[], Error>({
    queryKey: accessAndCrmQueryKeys.roles.selectorList(),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get(
        "/roles",
        ROLE_SELECTOR_PARAMS, signal, rolesPageContract,
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
    queryKey: accessAndCrmQueryKeys.roles.list(params),
    queryFn: ({ signal }) =>
      apiClient.get("/roles", {
        cursor: params.cursor,
        limit: params.limit,
        search: params.search,
      }, signal, rolesPageContract),
    staleTime: 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
};

export const useRole = (
  id: number,
  options?: Omit<
    UseQueryOptions<RoleRecordType, Error>,
    "queryKey" | "queryFn"
  >
) => {
  const canManage = useCan("settings:rbac:manage");
  return useQuery<RoleRecordType, Error>({
    queryKey: accessAndCrmQueryKeys.roles.detail(id),
    queryFn: ({ signal }) => apiClient.get(`/roles/${id}`, undefined, signal, roleContract),
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
      apiClient.delete<{ success: boolean }>(`/roles/${id}`, undefined, undefined, roleSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.roles.all });
    },
  });
};

export const useUpdateRole = (roleId: number) => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, { name: string }>("settings:rbac:manage", {
    mutationKey: ["roles", "update", roleId],
    mutationFn: ({ name }) =>
      apiClient.patch<{ success: boolean }>(`/roles/${roleId}`, { name }, undefined, roleSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.roles.all });
      queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.roles.detail(roleId),
      });
    },
  });
};

export function useMaterializeRoleTemplate() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Role, Error, { templateId: string }>("settings:rbac:manage", {
    mutationKey: ["roles", "materialize-template"],
    mutationFn: (data) => apiClient.post<Role>("/roles/templates", data, roleContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.roles.all }),
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
      apiClient.post<{ created: string[]; skipped: string[] }>("/roles/seed-defaults", undefined, seedDefaultRolesContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.roles.all });
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
    queryKey: accessAndCrmQueryKeys.roles.permissions(roleId),
    queryFn: ({ signal }) =>
      apiClient.get<RolePermissionGrant[]>(`/roles/${roleId}/permissions`, undefined, signal, rolePermissionGrantsContract),
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
      apiClient.put<{ success: true; version: number }>(`/roles/${roleId}/permissions`, { version, items }, setRolePermissionsContract),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<import("@/types/organization").Role>(
        accessAndCrmQueryKeys.roles.detail(variables.roleId),
        (old) => (old ? { ...old, version: data.version } : old),
      );
      void queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.roles.permissions(variables.roleId),
      });
      void queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.roles.list() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
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
    queryKey: accessAndCrmQueryKeys.roles.members(roleId),
    queryFn: ({ signal }) => apiClient.get<RoleMember[]>(`/roles/${roleId}/members`, undefined, signal, roleMembersContract),
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
      apiClient.post<{ success: boolean }>(`/roles/${roleId}/members`, body, roleSuccessContract),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.roles.members(variables.roleId),
      });
      queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.roles.list() });
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    },
  });
};

export const useUnassignRoleMember = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, UnassignRoleMemberInput>("settings:rbac:manage", {
    mutationKey: ["roles", "unassign-member"],
    mutationFn: ({ roleId, ...body }) =>
      apiClient.delete<{ success: boolean }>(`/roles/${roleId}/members`, body, undefined, roleSuccessContract),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: accessAndCrmQueryKeys.roles.members(variables.roleId),
      });
      queryClient.invalidateQueries({ queryKey: accessAndCrmQueryKeys.roles.list() });
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
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
    queryKey: accessAndCrmQueryKeys.roles.analytics(),
    queryFn: ({ signal }) => apiClient.get<RolesAnalytics>("/roles/analytics", undefined, signal, rolesAnalyticsContract),
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
    queryKey: accessAndCrmQueryKeys.roles.departments(),
    queryFn: ({ signal }) => apiClient.get<AssignableDepartment[]>("/roles/departments", undefined, signal, assignableDepartmentsContract),
    staleTime: 5 * 60_000,
    ...options,
    enabled: canManage && (options?.enabled ?? true),
  });
}
