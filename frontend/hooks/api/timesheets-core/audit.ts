"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AuditResponse } from "@/features/timesheets/types";

interface AuditQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export function useAuditEvents(query: AuditQuery = {}, enabled = true) {
  const canView = useCan("timesheets:audit:view");
  const params = {
    entityType: query.entityType,
    entityId: query.entityId,
    action: query.action,
    page: query.page,
    limit: query.limit,
  };
  return useQuery({
    queryKey: queryKeys.timesheets.audit(params),
    queryFn: () => apiClient.get<AuditResponse>("/timesheets/audit", params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}
