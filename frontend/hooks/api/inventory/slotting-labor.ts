"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { LocationType } from "@/hooks/api/inventory/warehouses";

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

/**
 * Mirrors `createSlottingRuleSchema` — which is `.strict()`, so an extra key is
 * a 400 rather than a field the server ignores. The three match payloads are
 * separately optional here and made exclusive by the form's own `superRefine`:
 * the server refuses a rule carrying two of them, and a rule that reads as
 * configured while matching nothing is worse than one that was refused.
 */
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

/**
 * `POST /inventory/slotting/rules` carries `@Idempotent("inventory.slotting.rule.create")`,
 * so the `Idempotency-Key` header is REQUIRED — without it the route answers 400
 * and the message reads like a body validation failure. The key belongs to the
 * planner's intent rather than to the attempt, which is what `useIdempotentMutation`
 * holds: a submit that stalls and is pressed again must not write a second rule.
 */
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
      // A new rule changes which zone the next sweep says a SKU belongs in, so
      // the recommendations computed against the old rule set are stale.
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
    },
  });
}

/**
 * `PATCH /inventory/slotting/rules/:ruleId` is activate/deactivate and nothing
 * else: `setSlottingRuleActiveSchema` is `.strict()` over exactly `{ isActive }`,
 * so any other field sent alongside is a 400. It carries no `@Idempotent`, so an
 * ordinary mutation is the right shape — a repeated flip to the same boolean is
 * already idempotent in the database.
 */
export function useSetSlottingRuleActive() {
  const qc = useQueryClient();
  return useMutation<SlottingRule, Error, { ruleId: number; isActive: boolean }>({
    mutationKey: ["inventory", "slotting", "rule", "setActive"],
    mutationFn: ({ ruleId, isActive }) =>
      apiClient.patch<SlottingRule>(`/inventory/slotting/rules/${ruleId}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRulesAll });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.slottingRecommendationsAll });
    },
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
