"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { LocationType } from "@/hooks/api/inventory/warehouses";

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

export interface CreateSlottingRuleInput {
  warehouseId: number;
  name: string;
  matchType: SlottingMatchType;
  velocityClass?: VelocityClass;
  categoryId?: number;
  productVariantId?: number;
  targetZoneLocationId: number;
  targetLocationType?: LocationType;
  priority: number;
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
  performancePct: number;
  unitsPerHour: number | null;
}

export function useSlottingRules(warehouseId?: number) {
  const canView = useCan("inventory:warehouses:read");
  return useQuery<SlottingRule[], Error>({
    queryKey: queryKeys.inventory.slottingRules(warehouseId ?? null),
    queryFn: ({ signal }) =>
      apiClient.get<SlottingRule[]>("/inventory/slotting/rules", {
        ...(warehouseId ? { warehouseId: String(warehouseId) } : {}),
      }, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateSlottingRule() {
  const qc = useQueryClient();
  return useIdempotentMutation<SlottingRule, Error, CreateSlottingRuleInput>({
    mutationKey: ["inventory", "slotting", "rule", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<SlottingRule>("/inventory/slotting/rules", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRulesAll });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
    },
  });
}

export function useSetSlottingRuleActive() {
  const qc = useQueryClient();
  return useAuthorizedMutation<SlottingRule, Error, { ruleId: number; isActive: boolean }>(
    "inventory:warehouses:manage",
    {
      mutationKey: ["inventory", "slotting", "rule", "setActive"],
      mutationFn: ({ ruleId, isActive }) =>
        apiClient.patch<SlottingRule>(`/inventory/slotting/rules/${ruleId}`, { isActive }),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRulesAll });
        qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
      },
    },
  );
}

export function useSlottingRecommendations(filters?: {
  warehouseId?: number;
  status?: RecommendationStatus;
}) {
  const canView = useCan("inventory:stock:read");
  return useQuery<SlottingRecommendation[], Error>({
    queryKey: queryKeys.inventory.slottingRecommendations(filters),
    queryFn: ({ signal }) =>
      apiClient.get<SlottingRecommendation[]>("/inventory/slotting/recommendations", {
        status: filters?.status ?? "PENDING",
        ...(filters?.warehouseId ? { warehouseId: String(filters.warehouseId) } : {}),
      }, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useIdempotentMutation<SlottingRecommendation, Error, { recommendationId: number; reason?: string }>({
    mutationKey: ["inventory", "slotting", "dismiss"],
    mutationFn: ({ recommendationId, reason }, idempotencyKey) =>
      apiClient.post<SlottingRecommendation>(
        `/inventory/slotting/recommendations/${recommendationId}/dismiss`,
        reason ? { reason } : {}, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
    },
  });
}

export function useApproveRecommendation() {
  const qc = useQueryClient();
  return useIdempotentMutation<unknown, Error, { recommendationId: number; toLocationId: number }>({
    mutationKey: ["inventory", "slotting", "approve"],
    mutationFn: ({ recommendationId, toLocationId }, idempotencyKey) =>
      apiClient.post(`/inventory/slotting/recommendations/${recommendationId}/approve`, {
        toLocationId,
      }, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfersList });
    },
  });
}

export function useLaborBoard(filters?: {
  warehouseId?: number;
  taskKind?: LaborTaskKind;
  windowDays?: number;
}) {
  const canView = useCan("inventory:labor:read");
  return useQuery<LaborBoardRow[], Error>({
    queryKey: queryKeys.inventory.laborBoard(filters),
    queryFn: ({ signal }) =>
      apiClient.get<LaborBoardRow[]>("/inventory/labor/board", {
        windowDays: String(filters?.windowDays ?? 7),
        ...(filters?.warehouseId ? { warehouseId: String(filters.warehouseId) } : {}),
        ...(filters?.taskKind ? { taskKind: filters.taskKind } : {}),
      }, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}
