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

export function useModuleAccessCatalog(moduleKey: string) {
  const canView = useCan(`${moduleKey}:access:view` as PermissionKey);
  return useQuery<ModulePermission[], Error>({
    queryKey: queryKeys.moduleAccess.catalog(moduleKey),
    queryFn: () =>
      apiClient.get<ModulePermission[]>(`/module-access/${moduleKey}/catalog`),
    enabled: canView,
    staleTime: 5 * 60_000,
  });
}

export function useModuleAccessRoles(moduleKey: string) {
  const canView = useCan(`${moduleKey}:access:view` as PermissionKey);
  return useQuery<ModuleRoleView[], Error>({
    queryKey: queryKeys.moduleAccess.roles(moduleKey),
    queryFn: () =>
      apiClient.get<ModuleRoleView[]>(`/module-access/${moduleKey}/roles`),
    enabled: canView,
    staleTime: 5 * 60_000,
  });
}

interface SetModuleRolePermissionsInput {
  roleId: number;
  items: { permissionKey: string; scope: DataScope }[];
}

export function useSetModuleRolePermissions(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, SetModuleRolePermissionsInput>({
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.access.me(),
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, variables.roleId],
      });
    },
  });
}
