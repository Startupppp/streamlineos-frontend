"use client";

import { useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { ApiError, lazyContract } from "@/lib/api-envelope";
import type {
  AccessResponse,
  DataScope,
  RbacDiscoveryGrantable,
  RbacDiscoveryMember,
} from "@/hooks/api/access-schema";
import type { Permission, PermissionKey } from "@/lib/rbac/permissions";
import { normalizeOrgModuleKey } from "@/lib/org-module-keys";
import { accessState, type AccessState } from "@/lib/rbac/gate";
import { blockedForProjectViewer, ProjectReadOnlyContext } from "@/lib/rbac/project-read-only";
import {
  gated,
  grantsPermission,
  permissionGate,
  type Gated,
  type PermissionGate,
} from "@/lib/rbac/permission-gate";

export type { PermissionGate };

const NO_ORGANIZATION_MESSAGE =
  "Your session has no active organization. Switch to an organization or sign in again.";

export const ACCESS_INVALIDATION_KEY_PREFIX = "access:invalidated";

export function signalAccessInvalidation(orgId: string): void {
  try {
    localStorage.setItem(`${ACCESS_INVALIDATION_KEY_PREFIX}:${orgId}`, Date.now().toString());
  } catch {}
}

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
  const { data: session, status } = useSession();
  const orgId = session?.orgId;
  const userId = session?.user?.id;
  const missingOrgContext = status === "authenticated" && !(orgId && userId);
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;
    const storageKey = `${ACCESS_INVALIDATION_KEY_PREFIX}:${orgId}`;
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [queryClient, orgId]);

  return useQuery<AccessResponse, Error>({
    ...INLINE_READ_ERROR,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: true,
    queryKey: platformCoreQueryKeys.access.me(),
    queryFn: ({ signal }) =>
      missingOrgContext
        ? Promise.reject(new ApiError(NO_ORGANIZATION_MESSAGE, undefined, "NO_ORGANIZATION_CONTEXT"))
        : apiClient.get("/me/access", undefined, signal, accessContract),
    ...restOptions,
    enabled: (missingOrgContext || (!!orgId && !!userId)) && (enabledOption ?? true),
  });
};

export function usePermissionGate(permission: PermissionKey): PermissionGate {
  const { data, isError } = useAccess();
  const projectReadOnly = useContext(ProjectReadOnlyContext);
  return permissionGate(
    permission,
    grantsPermission(data, permission) &&
      !(projectReadOnly && blockedForProjectViewer(permission)),
    data !== undefined,
    isError,
  );
}

export function useCan(permissionKey: PermissionKey): boolean {
  return usePermissionGate(permissionKey).allowed;
}

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

export function useModuleEnabled(moduleKey: string): boolean {
  const { data } = useAccess();
  if (!data) return true;
  return data.modules[normalizeOrgModuleKey(moduleKey)] === true;
}

export const usePermissionCatalog = (
  options?: Omit<UseQueryOptions<Permission[], Error>, "queryKey" | "queryFn">,
): Gated<UseQueryResult<Permission[], Error>> => {
  const access = usePermissionGate("settings:rbac:manage");
  const query = useQuery<Permission[], Error>({
    queryKey: accessAndCrmQueryKeys.roles.permissionCatalog(),
    queryFn: ({ signal }) =>
      apiClient.get("/rbac/permissions", undefined, signal, catalogContract),
    staleTime: 30 * 60_000,
    ...options,
    enabled: access.allowed && (options?.enabled ?? true),
  });
  return gated(query, access);
};

export const useRbacDiscoveryGrantable = (
  options?: Omit<
    UseQueryOptions<RbacDiscoveryGrantable, Error>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery<RbacDiscoveryGrantable, Error>({
    queryKey: accessAndCrmQueryKeys.roles.discoveryGrantable(),
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
    queryKey: accessAndCrmQueryKeys.roles.discoveryMembers(),
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
