"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AccessResponse,
  RbacDiscoveryGrantable,
  RbacDiscoveryMember,
} from "@/types/access";
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
  const userId = session?.user?.id;
  const { enabled: enabledOption, ...restOptions } = options ?? {};

  return useQuery<AccessResponse, Error>({
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    queryKey: queryKeys.access.me(orgId, userId),
    queryFn: () => apiClient.get<AccessResponse>("/me/access"),
    ...restOptions,
    enabled: !!orgId && !!userId && (enabledOption ?? true),
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

export const useRbacDiscoveryGrantable = (
  options?: Omit<
    UseQueryOptions<RbacDiscoveryGrantable, Error>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery<RbacDiscoveryGrantable, Error>({
    queryKey: queryKeys.roles.discoveryGrantable(),
    queryFn: () =>
      apiClient.get<RbacDiscoveryGrantable>("/rbac/discovery/grantable"),
    staleTime: 60_000,
    ...options,
  });

export const useRbacDiscoveryMembers = (
  options?: Omit<
    UseQueryOptions<RbacDiscoveryMember[], Error>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery<RbacDiscoveryMember[], Error>({
    queryKey: queryKeys.roles.discoveryMembers(),
    queryFn: () =>
      apiClient.get<RbacDiscoveryMember[]>("/rbac/discovery/members"),
    staleTime: 5 * 60_000,
    ...options,
  });
