"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { lazyContract } from "@/lib/api-envelope";
import type {
  AccessResponse,
  DataScope,
  RbacDiscoveryGrantable,
  RbacDiscoveryMember,
} from "@/hooks/api/access-schema";
import type { Permission, PermissionKey } from "@/lib/rbac/permissions";
import { normalizeOrgModuleKey } from "@/lib/module-vocabulary";
import {
  gated,
  permissionGate,
  type Gated,
  type PermissionGate,
} from "@/lib/rbac/permission-gate";

export type { PermissionGate };

/**
 * `access-schema` is the shortest path from the dashboard shell to Zod, and the
 * shell renders on every authenticated route — so importing these four as
 * values put Zod's entire runtime in every route's first load, including the
 * ones that never read an access endpoint. They are loaded when the read runs
 * instead. Each is still handed to `apiClient.get` in the contract slot, so
 * every one of these four routes is parsed exactly as before.
 */
const accessContract = lazyContract(() =>
  import("@/hooks/api/access-schema").then((m) => m.accessResponseContract),
);
const catalogContract = lazyContract(() =>
  import("@/hooks/api/access-schema").then((m) => m.permissionCatalogContract),
);
const grantableContract = lazyContract(() =>
  import("@/hooks/api/access-schema").then(
    (m) => m.rbacDiscoveryGrantableContract,
  ),
);
const membersContract = lazyContract(() =>
  import("@/hooks/api/access-schema").then(
    (m) => m.rbacDiscoveryMembersContract,
  ),
);

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
    queryFn: ({ signal }) =>
      apiClient.get("/me/access", undefined, signal, accessContract),
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

/**
 * Gated here rather than through `useGatedQuery` because this module is what
 * `hooks/api/gated-query` imports its gate from; calling back into it would
 * close an import cycle. The composition is the same one `useGatedQuery`
 * performs — the caller's own `enabled` is ANDed with the permission, never
 * replaced — and the result carries the same `access` gate.
 */
export const usePermissionCatalog = (
  options?: Omit<UseQueryOptions<Permission[], Error>, "queryKey" | "queryFn">,
): Gated<UseQueryResult<Permission[], Error>> => {
  const access = usePermissionGate("settings:rbac:manage");
  const query = useQuery<Permission[], Error>({
    queryKey: queryKeys.roles.permissionCatalog(),
    queryFn: ({ signal }) =>
      apiClient.get("/rbac/permissions", undefined, signal, catalogContract),
    staleTime: 30 * 60_000,
    ...options,
    enabled: access.allowed && (options?.enabled ?? true),
  });
  return gated(query, access);
};

/**
 * Deliberately ungated: `GET /rbac/discovery/grantable` is `@AuthorizedInService`
 * — `RbacService.getDiscoveryGrantable` narrows the result to what the caller
 * may themselves delegate, so there is no route permission to mirror.
 */
export const useRbacDiscoveryGrantable = (
  options?: Omit<
    UseQueryOptions<RbacDiscoveryGrantable, Error>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery<RbacDiscoveryGrantable, Error>({
    queryKey: queryKeys.roles.discoveryGrantable(),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/rbac/discovery/grantable",
        undefined,
        signal,
        grantableContract,
      ),
    staleTime: 60_000,
    ...options,
  });

export const useRbacDiscoveryMembers = (
  options?: Omit<
    UseQueryOptions<RbacDiscoveryMember[], Error>,
    "queryKey" | "queryFn"
  >,
): Gated<UseQueryResult<RbacDiscoveryMember[], Error>> => {
  const access = usePermissionGate("settings:rbac:manage");
  const query = useQuery<RbacDiscoveryMember[], Error>({
    queryKey: queryKeys.roles.discoveryMembers(),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/rbac/discovery/members",
        undefined,
        signal,
        membersContract,
      ),
    staleTime: 5 * 60_000,
    ...options,
    enabled: access.allowed && (options?.enabled ?? true),
  });
  return gated(query, access);
};
