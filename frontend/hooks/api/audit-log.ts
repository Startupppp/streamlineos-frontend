"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { useCan } from "@/hooks/api/access";
import { lazyContract } from "@/lib/api-envelope";

const auditLogListContract = lazyContract(() =>
  import("@/hooks/api/audit-log-schema").then((m) => m.auditLogListContract),
);
const auditLogActionsContract = lazyContract(() =>
  import("@/hooks/api/audit-log-schema").then((m) => m.auditLogActionsContract),
);
const auditLogTargetTypesContract = lazyContract(() =>
  import("@/hooks/api/audit-log-schema").then((m) => m.auditLogTargetTypesContract),
);

export interface AuditLogRow {
  id: number;
  action: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  targetId: string | null;
  targetType: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogPagination {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

interface AuditLogListResponse {
  logs: AuditLogRow[];
  pagination: AuditLogPagination;
}

interface AuditLogFilters {
  cursor?: string;
  limit?: number;
  action?: string;
  actions?: readonly string[];
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  userSearch?: string;
}

type AuditLogExportFilters = Omit<AuditLogFilters, "cursor" | "limit">;

export const useAuditLogs = (
  filters?: AuditLogFilters,
  options?: Omit<
    UseQueryOptions<AuditLogListResponse, Error>,
    "queryKey" | "queryFn"
  >
) => {
  const canView = useCan("audit-log:read");
  return useQuery<AuditLogListResponse, Error>({
    queryKey: accessAndCrmQueryKeys.auditLog.list(filters),
    queryFn: ({ signal }) =>
      apiClient.get<AuditLogListResponse>("/audit-log", {
        ...(filters?.cursor ? { cursor: filters.cursor } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
        ...(filters?.action ? { action: filters.action } : {}),
        ...(filters?.actions?.length ? { actions: filters.actions.join(",") } : {}),
        ...(filters?.targetType ? { targetType: filters.targetType } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.userSearch ? { userSearch: filters.userSearch } : {}),
      }, signal, auditLogListContract),
    staleTime: 30_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};

export const useAuditLogActions = (
  options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
) => {
  const canView = useCan("audit-log:read");
  return useQuery<string[], Error>({
    queryKey: accessAndCrmQueryKeys.auditLog.actions(),
    queryFn: ({ signal }) => apiClient.get<string[]>("/audit-log/actions", undefined, signal, auditLogActionsContract),
    staleTime: 10 * 60 * 1000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};

export const useAuditLogTargetTypes = (
  options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
) => {
  const canView = useCan("audit-log:read");
  return useQuery<string[], Error>({
    queryKey: accessAndCrmQueryKeys.auditLog.targetTypes(),
    queryFn: ({ signal }) => apiClient.get<string[]>("/audit-log/target-types", undefined, signal, auditLogTargetTypesContract),
    staleTime: 10 * 60 * 1000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};

export const useExportAuditLog = () =>
  useMutation<Blob, Error, AuditLogExportFilters>({
    mutationKey: ["auditLog", "export"],
    mutationFn: (filters) =>
      apiClient.download("/audit-log/export", {
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.actions?.length ? { actions: filters.actions.join(",") } : {}),
        ...(filters.targetType ? { targetType: filters.targetType } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.userSearch ? { userSearch: filters.userSearch } : {}),
      }),
  });
