"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export const ALLOCATION_OVERRIDE_READ = "inventory:audit:read";

export type AllocationOverrideVerdict = "NEAR_EXPIRY" | "SHELF_LIFE";

/**
 * One occasion somebody allocated a lot the expiry policy would have refused,
 * and the reason they gave for it.
 *
 * The policy fields are the policy *as it stood at the time*, copied onto the
 * row rather than joined — so the record still explains itself after the setting
 * behind it has been edited.
 */
export interface AllocationOverride {
  id: number;
  actorUserId: string;
  actorName: string | null;
  reason: string;
  verdict: AllocationOverrideVerdict;
  lotId: number;
  lotNumber: string;
  lotExpiryDate: string | null;
  daysRemaining: number | null;
  nearExpiryPolicy: string | null;
  nearExpiryWindowDays: number | null;
  minShelfLifeDays: number | null;
  productVariantId: number;
  sourceType: string | null;
  sourceId: string | null;
  clientId: number | null;
  clientName: string | null;
  reservationId: number | null;
  createdAt: string;
}

/**
 * Cursor-only, like the audit trail beside it: a register that is appended to
 * while it is read has no stable offsets, so the server offers no `page` and
 * counts nothing. Drive it with `useCursorPagination`.
 */
export interface AllocationOverridesPage {
  items: AllocationOverride[];
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface AllocationOverrideFilters {
  lotId?: number;
  clientId?: number;
  productVariantId?: number;
  verdict?: AllocationOverrideVerdict;
  actorUserId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  cursor?: string;
}

export function useAllocationOverrides(filters?: AllocationOverrideFilters) {
  const canView = useCan(ALLOCATION_OVERRIDE_READ);
  return useQuery<AllocationOverridesPage, Error>({
    queryKey: queryKeys.inventory.allocationOverrides(filters),
    queryFn: ({ signal }) =>
      apiClient.get<AllocationOverridesPage>("/inventory/traceability/allocation-overrides", {
        ...(filters?.lotId !== undefined ? { lotId: String(filters.lotId) } : {}),
        ...(filters?.clientId !== undefined ? { clientId: String(filters.clientId) } : {}),
        ...(filters?.productVariantId !== undefined
          ? { productVariantId: String(filters.productVariantId) }
          : {}),
        ...(filters?.verdict !== undefined ? { verdict: filters.verdict } : {}),
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
