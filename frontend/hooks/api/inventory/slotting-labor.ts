"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * NEO-6 / NEO-7 - slotting and the labour board.
 *
 * Two features, one hook file, because the screen that reads them is the same
 * supervisor's: "is my building laid out right" and "how is my shift doing" are
 * asked together and answered on one page.
 */
export type VelocityClass = "A" | "B" | "C";
export type SlottingMatchType = "VELOCITY_CLASS" | "CATEGORY" | "PRODUCT_VARIANT";
export type RecommendationStatus = "PENDING" | "APPROVED" | "DISMISSED" | "SUPERSEDED";
export type LaborTaskKind = "PICK" | "PUTAWAY" | "COUNT" | "RECEIVE";

export interface SlottingRule {
  id: number;
  warehouseId: number;
  name: string;
  matchType: SlottingMatchType;
  velocityClass: VelocityClass | null;
  categoryId: number | null;
  productVariantId: number | null;
  targetZoneLocationId: number;
  targetLocationType: string | null;
  priority: number;
  isActive: boolean;
}

export interface SlottingRecommendation {
  id: number;
  warehouseId: number;
  productVariantId: number;
  fromLocationId: number;
  toZoneLocationId: number;
  quantity: string;
  ruleId: number | null;
  reason: string;
  status: RecommendationStatus;
  createdAt: string;
}

export interface LaborBoardRow {
  userId: string;
  userName: string | null;
  lines: number;
  unitsDone: number;
  actualSeconds: number;
  standardSeconds: number;
  /** Above 100 is faster than standard. See `labor-standard.ts`. */
  performancePct: number;
  unitsPerHour: number | null;
}

export function useSlottingRules(warehouseId?: number) {
  const canView = useCan("inventory:warehouses:read");
  return useQuery<SlottingRule[], Error>({
    queryKey: queryKeys.inventory.slottingRules(warehouseId ?? null),
    queryFn: () =>
      apiClient.get<SlottingRule[]>("/inventory/slotting/rules", {
        ...(warehouseId ? { warehouseId: String(warehouseId) } : {}),
      }),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useSlottingRecommendations(filters?: {
  warehouseId?: number;
  status?: RecommendationStatus;
}) {
  const canView = useCan("inventory:stock:read");
  return useQuery<SlottingRecommendation[], Error>({
    queryKey: queryKeys.inventory.slottingRecommendations(filters),
    queryFn: () =>
      apiClient.get<SlottingRecommendation[]>("/inventory/slotting/recommendations", {
        status: filters?.status ?? "PENDING",
        ...(filters?.warehouseId ? { warehouseId: String(filters.warehouseId) } : {}),
      }),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useMutation<SlottingRecommendation, Error, { recommendationId: number; reason?: string }>({
    mutationKey: ["inventory", "slotting", "dismiss"],
    mutationFn: ({ recommendationId, reason }) =>
      apiClient.post<SlottingRecommendation>(
        `/inventory/slotting/recommendations/${recommendationId}/dismiss`,
        reason ? { reason } : {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
    },
  });
}

export function useApproveRecommendation() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { recommendationId: number; toLocationId: number }>({
    mutationKey: ["inventory", "slotting", "approve"],
    mutationFn: ({ recommendationId, toLocationId }) =>
      apiClient.post(`/inventory/slotting/recommendations/${recommendationId}/approve`, {
        toLocationId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
      // Approving raises a transfer, so the transfer list is stale too.
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfersList });
    },
  });
}

/**
 * Gated on `inventory:labor:read` — its own key, because this screen names
 * individual people and rates their work. That is an authority an organisation
 * grants deliberately, not one that arrives with the ability to read a stock
 * summary.
 */
export function useLaborBoard(filters?: {
  warehouseId?: number;
  taskKind?: LaborTaskKind;
  windowDays?: number;
}) {
  const canView = useCan("inventory:labor:read");
  return useQuery<LaborBoardRow[], Error>({
    queryKey: queryKeys.inventory.laborBoard(filters),
    queryFn: () =>
      apiClient.get<LaborBoardRow[]>("/inventory/labor/board", {
        windowDays: String(filters?.windowDays ?? 7),
        ...(filters?.warehouseId ? { warehouseId: String(filters.warehouseId) } : {}),
        ...(filters?.taskKind ? { taskKind: filters.taskKind } : {}),
      }),
    enabled: canView,
    staleTime: 60_000,
  });
}
