"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AdjustmentDetail } from "@/types/inventory";
import type { AdjustmentStatus } from "@/features/inventory/lib";

export type AdjustmentReason =
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "EXPIRY"
  | "THEFT"
  | "RECOUNT"
  | "OTHER"
  | "SCRAP";

/**
 * D8. The reasons that condemn stock. A write-off is one of these on an
 * ordinary adjustment — there is no second document and no second endpoint —
 * so the client asks the same questions of it that the server does: every line
 * must remove stock, and a scrap location is only meaningful here.
 */
export const WRITE_OFF_REASONS: readonly AdjustmentReason[] = ["DAMAGE", "EXPIRY", "THEFT", "SCRAP"];

const WRITE_OFF_REASON_SET: ReadonlySet<string> = new Set(WRITE_OFF_REASONS);

/** Takes a plain string, so a detail payload's `reason` needs no cast. */
export function isWriteOffReason(reason: string): boolean {
  return WRITE_OFF_REASON_SET.has(reason);
}

type AdjustmentType = "IN" | "OUT" | "SET";

export interface AdjustmentListItem {
  id: number;
  referenceNumber: string;
  reason: AdjustmentReason;
  status: AdjustmentStatus;
  notes: string | null;
  createdAt: string;
  createdByName: string | null;
  lineCount: number;
  /** Absent for a caller without `inventory:valuation:read`. */
  writtenOffValue: string | null | undefined;
}

interface AdjustmentsResult {
  items: AdjustmentListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateAdjustmentInput {
  productVariantId: number;
  locationId: number;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
  scrapLocationId?: number;
}

interface RawAdjustment {
  id: number;
  referenceNumber: string;
  reason: AdjustmentReason;
  status: AdjustmentStatus;
  notes: string | null;
  createdAt: string;
  creator: { id: string; name: string | null } | null;
  lines: Array<{ id: number }>;
  writtenOffValue?: string | null;
}

interface RawAdjustmentsResponse {
  items: RawAdjustment[];
  total: number;
  page: number;
  totalPages: number;
}

function toAdjustmentListItem(r: RawAdjustment): AdjustmentListItem {
  return {
    id: r.id,
    referenceNumber: r.referenceNumber,
    reason: r.reason,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt,
    createdByName: r.creator?.name ?? null,
    lineCount: r.lines?.length ?? 0,
    writtenOffValue: "writtenOffValue" in r ? r.writtenOffValue : undefined,
  };
}

function signedQuantity(type: AdjustmentType, quantity: number): number {
  const magnitude = Math.abs(quantity);
  return type === "OUT" ? -magnitude : magnitude;
}

export function useAdjustments(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  reason?: string;
  writeOffsOnly?: boolean;
}) {
  const canView = useCan("inventory:stock:read");
  return useQuery<AdjustmentsResult, Error>({
    queryKey: queryKeys.inventory.adjustments(filters),
    queryFn: async () => {
      const res = await apiClient.get<RawAdjustmentsResponse>("/inventory/stock/adjustments", {
        page: filters?.page,
        limit: filters?.limit,
        status: filters?.status,
        reason: filters?.reason,
        writeOffsOnly: filters?.writeOffsOnly,
      });
      return {
        items: res.items.map(toAdjustmentListItem),
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
      };
    },
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useAdjustmentDetail(adjustmentId: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<AdjustmentDetail, Error>({
    queryKey: [...queryKeys.inventory.adjustments(), adjustmentId] as const,
    queryFn: () => apiClient.get<AdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}`),
    enabled: canView && adjustmentId > 0,
    staleTime: 60_000,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation<AdjustmentDetail, Error, CreateAdjustmentInput>({
    mutationKey: ["inventory", "adjustment", "create"],
    mutationFn: (data) =>
      apiClient.post<AdjustmentDetail>(
        "/inventory/stock/adjustments",
        {
          reason: data.reason,
          notes: data.notes,
          scrapLocationId: data.scrapLocationId,
          lines: [
            {
              productVariantId: data.productVariantId,
              locationId: data.locationId,
              quantityChange: signedQuantity(data.adjustmentType, data.quantity),
              notes: data.notes,
            },
          ],
        },
        // `apiClient` mints the `Idempotency-Key` for every mutating request,
        // and the endpoint refuses this command without one. A write-off is the
        // case where a duplicate is not cosmetic: two documents, both
        // approvable, both postable, against the same missing stock.
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useApproveAdjustment() {
  const qc = useQueryClient();
  return useMutation<AdjustmentDetail, Error, number>({
    mutationKey: ["inventory", "adjustment", "approve"],
    mutationFn: (adjustmentId) =>
      apiClient.post<AdjustmentDetail>(
        `/inventory/stock/adjustments/${adjustmentId}/approve`,
        {},
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
    },
  });
}

export function usePostAdjustment() {
  const qc = useQueryClient();
  return useMutation<AdjustmentDetail, Error, number>({
    mutationKey: ["inventory", "adjustment", "post"],
    mutationFn: (adjustmentId) =>
      apiClient.post<AdjustmentDetail>(
        `/inventory/stock/adjustments/${adjustmentId}/post`,
        {},
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useCancelAdjustment() {
  const qc = useQueryClient();
  return useMutation<AdjustmentDetail, Error, number>({
    mutationKey: ["inventory", "adjustment", "cancel"],
    mutationFn: (adjustmentId) =>
      apiClient.post<AdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}/cancel`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
    },
  });
}
