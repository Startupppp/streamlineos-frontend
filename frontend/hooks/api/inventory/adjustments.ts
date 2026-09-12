"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedIdempotentMutation } from "./use-idempotent-mutation";
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

/**
 * The wire shape of an adjustment document, as `getAdjustment` and every command
 * on it return it: the row with its relations nested (`creator`,
 * `lines[].productVariant`, `lines[].location`) and quantities as decimal
 * strings. `AdjustmentDetail` is the flattened view the screens read, so without
 * this mapping the detail sheet rendered a fallback for "Created by" and for
 * every line's variant and location. Everything past the row is optional: a
 * command answers with its lines bare, not with their variant and location.
 */
interface RawAdjustmentDetailLine {
  id: number;
  productVariantId: number;
  locationId: number;
  quantityChange: string;
  notes: string | null;
  productVariant?: { id: number; name: string | null; sku: string | null } | null;
  location?: { id: number; name: string; code: string } | null;
}

interface RawAdjustmentDetail {
  id: number;
  referenceNumber: string;
  reason: string;
  status: AdjustmentDetail["status"];
  notes: string | null;
  createdAt: string;
  approvedAt?: string | null;
  postedAt?: string | null;
  scrapLocationId?: number | null;
  scrapLocation?: { id: number; name: string; code: string } | null;
  writtenOffValue?: string | null;
  creator?: { id: string; name: string | null } | null;
  lines?: RawAdjustmentDetailLine[];
}

function toAdjustmentDetail(raw: RawAdjustmentDetail): AdjustmentDetail {
  return {
    id: raw.id,
    referenceNumber: raw.referenceNumber,
    reason: raw.reason,
    status: raw.status,
    notes: raw.notes,
    createdAt: raw.createdAt,
    approvedAt: raw.approvedAt ?? null,
    postedAt: raw.postedAt ?? null,
    createdByName: raw.creator?.name ?? null,
    scrapLocationId: raw.scrapLocationId ?? null,
    scrapLocation: raw.scrapLocation ?? null,
    // Absent, not null, for a caller without `inventory:valuation:read`.
    ...("writtenOffValue" in raw ? { writtenOffValue: raw.writtenOffValue } : {}),
    lines: (raw.lines ?? []).map((line) => ({
      id: line.id,
      productVariantId: line.productVariantId,
      locationId: line.locationId,
      quantityChange: Number(line.quantityChange),
      variantName: line.productVariant?.name ?? null,
      variantSku: line.productVariant?.sku ?? null,
      locationName: line.location?.name ?? null,
      notes: line.notes,
    })),
  };
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
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<RawAdjustmentsResponse>("/inventory/stock/adjustments", {
        page: filters?.page,
        limit: filters?.limit,
        status: filters?.status,
        reason: filters?.reason,
        writeOffsOnly: filters?.writeOffsOnly,
      }, signal);
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
    queryFn: async ({ signal }) =>
      toAdjustmentDetail(
        await apiClient.get<RawAdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}`, undefined, signal),
      ),
    enabled: canView && adjustmentId > 0,
    staleTime: 60_000,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<AdjustmentDetail, Error, CreateAdjustmentInput>("inventory:stock:adjust", {
    mutationKey: ["inventory", "adjustment", "create"],
    mutationFn: async (data, idempotencyKey) =>
      toAdjustmentDetail(await apiClient.post<RawAdjustmentDetail>(
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
        // A write-off is the case where a duplicate is not cosmetic: two
        // documents, both approvable, both postable, against the same missing
        // stock. The key `apiClient` mints is per fetch, so it cannot prevent
        // that; this one belongs to the operator's intent and survives a retry.
        { headers: { "Idempotency-Key": idempotencyKey } },
      )),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useApproveAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<AdjustmentDetail, Error, number>("inventory:adjustments:approve", {
    mutationKey: ["inventory", "adjustment", "approve"],
    mutationFn: async (adjustmentId, idempotencyKey) =>
      toAdjustmentDetail(await apiClient.post<RawAdjustmentDetail>(
        `/inventory/stock/adjustments/${adjustmentId}/approve`,
        {}, { headers: { "Idempotency-Key": idempotencyKey } },
      )),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
    },
  });
}

export function usePostAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<AdjustmentDetail, Error, number>("inventory:adjustments:post", {
    mutationKey: ["inventory", "adjustment", "post"],
    mutationFn: async (adjustmentId, idempotencyKey) =>
      toAdjustmentDetail(await apiClient.post<RawAdjustmentDetail>(
        `/inventory/stock/adjustments/${adjustmentId}/post`,
        {}, { headers: { "Idempotency-Key": idempotencyKey } },
      )),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useCancelAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<AdjustmentDetail, Error, number>("inventory:stock:adjust", {
    mutationKey: ["inventory", "adjustment", "cancel"],
    mutationFn: async (adjustmentId, idempotencyKey) =>
      toAdjustmentDetail(await apiClient.post<RawAdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}/cancel`, {}, { headers: { "Idempotency-Key": idempotencyKey } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
    },
  });
}
