"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AdjustmentDetail } from "@/types/inventory";
import type { AdjustmentStatus } from "@/features/inventory/lib";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type AdjustmentReason =
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "EXPIRY"
  | "THEFT"
  | "RECOUNT"
  | "OTHER";

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
  };
}

function signedQuantity(type: AdjustmentType, quantity: number): number {
  const magnitude = Math.abs(quantity);
  return type === "OUT" ? -magnitude : magnitude;
}

const listAdjustmentsContract = lazyContract(() =>
  import("@/hooks/api/inventory/stock-schema").then((m) => m.listAdjustmentsContract),
);
const getAdjustmentContract = lazyContract(() =>
  import("@/hooks/api/inventory/stock-schema").then((m) => m.getAdjustmentContract),
);

export function useAdjustments(filters?: { page?: number; limit?: number; status?: string }) {
  const canView = useCan("inventory:stock:read");
  return useQuery<AdjustmentsResult, Error>({
    queryKey: queryKeys.inventory.adjustments(filters),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<RawAdjustmentsResponse>("/inventory/stock/adjustments", {
        page: filters?.page,
        limit: filters?.limit,
        status: filters?.status,
      }, signal, listAdjustmentsContract);
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
    queryFn: ({ signal }) => apiClient.get<AdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}`, undefined, signal, getAdjustmentContract),
    enabled: canView && adjustmentId > 0,
    staleTime: 60_000,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedMutation<AdjustmentDetail, Error, CreateAdjustmentInput>("inventory:stock:adjust", {
    mutationKey: ["inventory", "adjustment", "create"],
    mutationFn: (data) =>
      apiClient.post<AdjustmentDetail>("/inventory/stock/adjustments", {
        reason: data.reason,
        notes: data.notes,
        lines: [
          {
            productVariantId: data.productVariantId,
            locationId: data.locationId,
            quantityChange: signedQuantity(data.adjustmentType, data.quantity),
            notes: data.notes,
          },
        ],
      }, undefined, getAdjustmentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useApproveAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedMutation<AdjustmentDetail, Error, number>("inventory:adjustments:approve", {
    mutationKey: ["inventory", "adjustment", "approve"],
    mutationFn: (adjustmentId) =>
      apiClient.post<AdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}/approve`, {}, undefined, getAdjustmentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
    },
  });
}

export function usePostAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedMutation<AdjustmentDetail, Error, number>("inventory:adjustments:post", {
    mutationKey: ["inventory", "adjustment", "post"],
    mutationFn: (adjustmentId) =>
      apiClient.post<AdjustmentDetail>(
        `/inventory/stock/adjustments/${adjustmentId}/post`,
        {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        getAdjustmentContract,
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
  return useAuthorizedMutation<AdjustmentDetail, Error, number>("inventory:stock:adjust", {
    mutationKey: ["inventory", "adjustment", "cancel"],
    mutationFn: (adjustmentId) =>
      apiClient.post<AdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}/cancel`, {}, undefined, getAdjustmentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
    },
  });
}
