"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export interface InventoryAuditEvent {
  id: number;
  action: string;
  resourceType: string;
  resourceId: string;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface InventoryAuditEventFilters {
  resourceType?: string;
  resourceId?: string;
  action?: string;
  actorUserId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  cursor?: string;
}

/**
 * The audit trail is cursor-only.
 *
 * There is no `page` here because the backend does not offer one: a trail that
 * is appended to while it is read has no stable offsets, and there were no
 * page-based callers to keep working. Drive it with `useCursorPagination`.
 */
export interface InventoryAuditEventsPage {
  items: InventoryAuditEvent[];
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export function useInventoryAuditEvents(filters?: InventoryAuditEventFilters) {
  const canView = useCan("inventory:audit:read");
  return useQuery<InventoryAuditEventsPage, Error>({
    queryKey: queryKeys.inventory.auditEvents(filters),
    queryFn: ({ signal }) =>
      apiClient.get<InventoryAuditEventsPage>("/inventory/audit-events", {
        ...(filters?.resourceType !== undefined ? { resourceType: filters.resourceType } : {}),
        ...(filters?.resourceId !== undefined ? { resourceId: filters.resourceId } : {}),
        ...(filters?.action !== undefined ? { action: filters.action } : {}),
        ...(filters?.actorUserId !== undefined ? { actorUserId: filters.actorUserId } : {}),
        ...(filters?.fromDate !== undefined ? { fromDate: filters.fromDate } : {}),
        ...(filters?.toDate !== undefined ? { toDate: filters.toDate } : {}),
        ...(filters?.limit !== undefined ? { limit: String(filters.limit) } : {}),
        ...(filters?.cursor !== undefined ? { cursor: filters.cursor } : {}),
      }, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}
