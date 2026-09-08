"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";
import type { AuditEvent } from "@/features/timesheets/audit-types";
import type { CursorPage } from "@/features/timesheets/types";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const auditListC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-audit-schema").then((m) => m.auditListResponseContract),
);

interface AuditQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
}

interface AuditQueryParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  limit: number;
  cursor?: string;
}

export function useAuditEvents(query: AuditQuery = {}, enabled = true) {
  const canView = useCan("timesheets:audit:view");
  const filters = {
    entityType: query.entityType,
    entityId: query.entityId,
    action: query.action,
    limit: query.limit ?? 20,
  };
  return useInfiniteQuery<CursorPage<AuditEvent>>({
    queryKey: usersAndCommerceQueryKeys.timesheets.audit(filters),
    queryFn: ({ pageParam , signal }) => {
      const params: AuditQueryParams = {
        entityType: filters.entityType,
        entityId: filters.entityId,
        action: filters.action,
        limit: filters.limit,
      };
      if (typeof pageParam === "string") params.cursor = pageParam;
      return apiClient.get<CursorPage<AuditEvent>>("/timesheets/audit", params, signal, auditListC);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: enabled && canView,
  });
}
