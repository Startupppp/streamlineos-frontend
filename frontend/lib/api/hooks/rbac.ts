"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Permission } from "@/types/organization";

export { useSetRolePermissions as useUpdateRolePermissions } from "./roles";

export const useUserPermissions = (
  options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<string[], Error>({
    queryKey: queryKeys.rbac.userPermissions(),
    queryFn: () => apiClient.get<string[]>("/rbac/user-permissions"),
    staleTime: 30 * 60_000,
    ...options,
  });
};

export const useAllPermissions = (
  options?: Omit<
    UseQueryOptions<Permission[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<Permission[], Error>({
    queryKey: queryKeys.rbac.allPermissions(),
    queryFn: () => apiClient.get<Permission[]>("/rbac/permissions"),
    staleTime: Infinity,
    ...options,
  });
};


