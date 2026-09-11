"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AccessResponse,
  DataScope,
  RbacDiscoveryGrantable,
  RbacDiscoveryMember,
} from "@/types/access";
import type { Permission, PermissionKey } from "@/lib/rbac/permissions";
import { normalizeOrgModuleKey } from "@/lib/module-vocabulary";
import { accessState, type AccessState } from "@/lib/rbac/gate";
import { permissionGate, type PermissionGate } from "@/lib/rbac/permission-gate";

export type { PermissionGate };

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
    queryKey: queryKeys.access.me(),
    queryFn: () => apiClient.get<AccessResponse>("/me/access"),
    ...restOptions,
    enabled: !!orgId && !!userId && (enabledOption ?? true),
  });
};

export function usePermissionGate(permission: PermissionKey): PermissionGate {
  const { data } = useAccess();
  const allowed = data ? data.isOrgOwner || permission in data.scopes : false;
  return permissionGate(permission, allowed, data !== undefined);
}

export function useCan(permissionKey: PermissionKey): boolean {
  return usePermissionGate(permissionKey).allowed;
}

/**
 * The same question, answered in three values instead of two.
 *
 * `useCan` cannot distinguish "denied" from "not known yet" -- both are `false`,
 * because until the access response lands there is nothing to check against.
 * That is fine for deciding whether to *enable* a query, which is all it was
 * built for, and wrong for deciding what to *render*: a screen that branches on
 * the boolean tells a user who does hold the permission that access is
 * restricted, for as long as their own rights take to arrive.
 *
 * Ticket 26 is the other half of the same conflation, one layer down. Use this
 * with `resolveGate` wherever the answer decides what a person sees.
 */
export function useCanState(permissionKey: PermissionKey): AccessState {
  const { data, isLoading } = useAccess();
  return accessState({
    isLoading: isLoading || !data,
    granted: !!data && (data.isOrgOwner || permissionKey in data.scopes),
  });
}

export function useScope(permissionKey: PermissionKey): DataScope {
  const { data } = useAccess();
  if (!data) return "none";
  if (data.isOrgOwner) return "all";
  return data.scopes[permissionKey] ?? "none";
}

export function canManageOrganizationMembership(
  access: AccessResponse | undefined,
): boolean {
  return access?.canManageOrganizationMembership === true;
}

export function useCanManageOrganizationMembership(): boolean {
  const { data } = useAccess();
  return canManageOrganizationMembership(data);
}

/**
 * Module enablement is org configuration, not a permission — owners and
 * platform admins are gated by it too (they can turn a module on in
 * Settings → Modules). Only non-toggleable namespaces read as enabled.
 */
export function useModuleEnabled(moduleKey: string): boolean {
  const { data } = useAccess();
  if (!data) return true;
  return data.modules[normalizeOrgModuleKey(moduleKey)] === true;
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
