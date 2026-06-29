"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AccessResponse } from "@/types/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

export const useAccess = (
  options?: Omit<UseQueryOptions<AccessResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<AccessResponse, Error>({
    queryKey: queryKeys.access.me(),
    queryFn: () => apiClient.get<AccessResponse>("/me/access"),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export function useCan(permissionKey: PermissionKey): boolean {
  const { data } = useAccess();
  if (!data) return false;
  if (data.isOrgOwner) return true;
  return data.permissions.includes(permissionKey);
}

