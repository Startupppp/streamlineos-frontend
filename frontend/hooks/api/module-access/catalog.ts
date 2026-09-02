"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AuditCursorPage, AuditLogEntry, ModuleMyPermissions, ModulePermission } from "./types";
import { viewKey } from "./types";
import {
  moduleCatalogContract,
  moduleMyPermissionsContract,
} from "./module-access-schema";

export function useModuleAccessCatalog(
  moduleKey: string,
  options?: { enabled?: boolean },
) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModulePermission[], Error>({
    queryKey: queryKeys.moduleAccess.catalog(moduleKey),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/module-access/${moduleKey}/catalog`,
        undefined,
        signal,
        moduleCatalogContract,
      ),
    enabled: canView && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
  });
}

export function useModuleMyPermissions(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleMyPermissions, Error>({
    queryKey: queryKeys.moduleAccess.myPermissions(moduleKey),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/module-access/${moduleKey}/me/permissions`,
        undefined,
        signal,
        moduleMyPermissionsContract,
      ),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useModuleAuditLog(
  moduleKey: string,
  limit: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan(viewKey(moduleKey));
  return useInfiniteQuery<AuditCursorPage<AuditLogEntry>, Error>({
    queryKey: queryKeys.moduleAccess.auditLog(moduleKey, { limit }),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (typeof pageParam === "string") params.set("cursor", pageParam);
      return apiClient.get<AuditCursorPage<AuditLogEntry>>(
        `/module-access/${moduleKey}/audit-log?${params.toString()}`,
        undefined,
        signal,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}
