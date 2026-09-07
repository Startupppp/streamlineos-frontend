"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";
import type { AuditEvent } from "@/features/timesheets/audit-types";
import type { CursorPage } from "@/features/timesheets/types";

const auditListC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-audit-schema").then((m) => m.auditListResponseContract),
);

interface AuditQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
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
      const params: Record<string, unknown> = { ...filters };
      if (typeof pageParam === "string") params.cursor = pageParam;
      return apiClient.get<CursorPage<AuditEvent>>("/timesheets/audit", params, signal, auditListC);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: enabled && canView,
  });
}
