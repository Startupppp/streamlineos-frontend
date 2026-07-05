"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
  | "OTHER";

export type AdjustmentType = "IN" | "OUT" | "SET";

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

export function useAdjustments(filters?: { page?: number; limit?: number; status?: string }) {
  return useQuery<AdjustmentsResult, Error>({
    queryKey: queryKeys.inventory.adjustments(filters),
    queryFn: async () => {
      const res = await apiClient.get<RawAdjustmentsResponse>("/inventory/stock/adjustments", {
        page: filters?.page,
        limit: filters?.limit,
        status: filters?.status,
      });
      return {
        items: res.items.map(toAdjustmentListItem),
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
      };
    },
    staleTime: 2 * 60_000,
  });
}

export function useAdjustmentDetail(adjustmentId: number) {
  return useQuery<AdjustmentDetail, Error>({
    queryKey: [...queryKeys.inventory.adjustments(), adjustmentId],
    queryFn: () => apiClient.get<AdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}`),
    enabled: adjustmentId > 0,
    staleTime: 60_000,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation<AdjustmentDetail, Error, CreateAdjustmentInput>({
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
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useApproveAdjustment() {
  const qc = useQueryClient();
  return useMutation<AdjustmentDetail, Error, number>({
    mutationKey: ["inventory", "adjustment", "approve"],
    mutationFn: (adjustmentId) =>
      apiClient.post<AdjustmentDetail>(`/inventory/stock/adjustments/${adjustmentId}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
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
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
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
      qc.invalidateQueries({ queryKey: queryKeys.inventory.adjustments() });
    },
  });
}
