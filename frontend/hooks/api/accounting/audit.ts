"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";

export interface AuditLogEntry {
  id: number;
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditExportEntry {
  id: number;
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: number | null;
  createdAt: string;
}

const auditKeys = {
  all: ["streamlineos", "accounting", "audit"] as const,
  list: (params?: object) =>
    ["streamlineos", "accounting", "audit", "list", params] as const,
  export: (params?: object) =>
    ["streamlineos", "accounting", "audit", "export", params] as const,
};

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface ListAuditParams {
  cursor?: string;
  limit?: number;
  entityType?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export function useAuditLog(params: ListAuditParams = {}) {
  const can = useCan("accounting:audit:read");
  return useQuery<CursorPage<AuditLogEntry>, Error>({
    queryKey: auditKeys.list(params),
    queryFn: () =>
      apiClient.get<CursorPage<AuditLogEntry>>("/accounting/audit", toQuery(params)),
    staleTime: 30_000,
    enabled: can,
  });
}

export interface ListAuditExportParams {
  cursor?: string;
  limit?: number;
  entityType?: string;
  from?: string;
  to?: string;
}

export function useAuditExport(params: ListAuditExportParams = {}) {
  const can = useCan("accounting:audit:read");
  return useQuery<CursorPage<AuditExportEntry>, Error>({
    queryKey: auditKeys.export(params),
    queryFn: () =>
      apiClient.get<CursorPage<AuditExportEntry>>("/accounting/audit/export", toQuery(params)),
    staleTime: 30_000,
    enabled: can,
  });
}
