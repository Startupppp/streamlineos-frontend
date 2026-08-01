"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AccessResponse } from "@/types/access";
import type { Permission, PermissionKey } from "@/lib/rbac/permissions";
import { normalizeOrgModuleKey } from "@/lib/module-vocabulary";

export const useAccess = (
  options?: Omit<
    UseQueryOptions<AccessResponse, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const { data: session } = useSession();

  const orgId = session?.orgId;

  return useQuery<AccessResponse, Error>({
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryKey: queryKeys.access.me(),
    queryFn: () => apiClient.get<AccessResponse>("/me/access"),
    ...options,
  });
};

export function useCan(permissionKey: PermissionKey): boolean {
  const { data } = useAccess();
  if (!data) return false;
  if (data.isOrgOwner) return true;
  return data.permissions.includes(permissionKey);
}

/**
 * Module enablement is org configuration, not a permission — owners and
 * platform admins are gated by it too (they can turn a module on in
 * Settings → Modules). Only non-toggleable namespaces read as enabled.
 */
export function useModuleEnabled(moduleKey: string): boolean {
  const { data } = useAccess();
  if (!data) return true;
  return data.modules[normalizeOrgModuleKey(moduleKey)] !== false;
}


export const usePermissionCatalog = (
  options?: Omit<UseQueryOptions<Permission[], Error>, "queryKey" | "queryFn">,
) =>
  useQuery<Permission[], Error>({
    queryKey: queryKeys.roles.permissionCatalog(),
    queryFn: () => apiClient.get<Permission[]>("/rbac/permissions"),
    staleTime: 30 * 60_000,
    ...options,
  });
