"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AuditLogEntry, ModuleMyPermissions, ModulePermission, PaginatedResult } from "./types";
import { viewKey } from "./types";

export function useModuleAccessCatalog(
  moduleKey: string,
  options?: { enabled?: boolean },
) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModulePermission[], Error>({
    queryKey: queryKeys.moduleAccess.catalog(moduleKey),
    queryFn: () =>
      apiClient.get<ModulePermission[]>(`/module-access/${moduleKey}/catalog`),
    enabled: canView && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
  });
}

export function useModuleMyPermissions(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleMyPermissions, Error>({
    queryKey: queryKeys.moduleAccess.myPermissions(moduleKey),
    queryFn: () =>
      apiClient.get<ModuleMyPermissions>(`/module-access/${moduleKey}/me/permissions`),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useModuleAuditLog(
  moduleKey: string,
  page: number,
  pageSize: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<PaginatedResult<AuditLogEntry>, Error>({
    queryKey: queryKeys.moduleAccess.auditLog(moduleKey, { page, pageSize }),
    queryFn: () =>
      apiClient.get<PaginatedResult<AuditLogEntry>>(
        `/module-access/${moduleKey}/audit-log?page=${page}&pageSize=${pageSize}`,
      ),
    enabled: canView && (options?.enabled ?? true),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}
