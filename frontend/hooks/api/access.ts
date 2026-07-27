"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AccessResponse } from "@/types/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

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
  if (data.isOrgOwner || data.isPlatformAdmin) return true;
  return data.permissions.includes(permissionKey);
}

export function useModuleEnabled(moduleKey: string): boolean {
  const { data } = useAccess();
  if (!data) return true;
  if (data.isOrgOwner || data.isPlatformAdmin) return true;
  const enabled = data.modules[moduleKey];
  return enabled !== false;
}
