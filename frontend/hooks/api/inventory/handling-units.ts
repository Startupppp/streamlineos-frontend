"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * NEO-4 - handling units.
 *
 * `contents` is what this unit holds directly and is always empty on a unit that
 * contains other units: stock lives on leaves. `rolledUpContents` is what the
 * label means - this unit and every unit nested inside it - and is the figure to
 * show a person looking at a pallet.
 */
export type HandlingUnitKind = "PALLET" | "CARTON" | "CAGE" | "TOTE";
export type HandlingUnitStatus = "OPEN" | "CLOSED" | "SHIPPED" | "EMPTY";

export interface HandlingUnitSummary {
  id: number;
  huCode: string;
  kind: HandlingUnitKind;
  status: HandlingUnitStatus;
  locationId: number | null;
  parentHuId: number | null;
  updatedAt: string;
}

export interface HandlingUnitContentRow {
  productVariantId: number;
  lotId: number | null;
  serialId: number | null;
  handlingUnitId: number;
  onHand: string;
}

export interface HandlingUnitDetail {
  id: number;
  huCode: string;
  kind: HandlingUnitKind;
  status: HandlingUnitStatus;
  locationId: number | null;
  parentHuId: number | null;
  childIds: number[];
  contents: HandlingUnitContentRow[];
  rolledUpContents: HandlingUnitContentRow[];
}

interface CreateHandlingUnitInput {
  huCode?: string;
  kind: HandlingUnitKind;
  locationId?: number;
}

interface MoveHandlingUnitInput {
  handlingUnitId: number;
  toLocationId: number;
}

interface NestHandlingUnitInput {
  handlingUnitId: number;
  parentHuId: number | null;
}

export function useHandlingUnits(filters?: {
  locationId?: number;
  status?: HandlingUnitStatus;
  rootsOnly?: boolean;
}) {
  const canView = useCan("inventory:stock:read");
  return useQuery<HandlingUnitSummary[], Error>({
    queryKey: queryKeys.inventory.handlingUnits(filters),
    queryFn: () =>
      apiClient.get<HandlingUnitSummary[]>("/inventory/handling-units", {
        ...(filters?.locationId ? { locationId: String(filters.locationId) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.rootsOnly ? { rootsOnly: "true" } : {}),
      }),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useHandlingUnit(handlingUnitId: number | null) {
  const canView = useCan("inventory:stock:read");
  return useQuery<HandlingUnitDetail, Error>({
    queryKey: queryKeys.inventory.handlingUnit(handlingUnitId ?? 0),
    queryFn: () => apiClient.get<HandlingUnitDetail>(`/inventory/handling-units/${handlingUnitId}`),
    enabled: canView && (handlingUnitId ?? 0) > 0,
    staleTime: 30_000,
  });
}

export function useCreateHandlingUnit() {
  const qc = useQueryClient();
  return useIdempotentMutation<HandlingUnitDetail, Error, CreateHandlingUnitInput>({
    mutationKey: ["inventory", "handling-unit", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<HandlingUnitDetail>("/inventory/handling-units", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.handlingUnitsList });
    },
  });
}

export function useMoveHandlingUnit() {
  const qc = useQueryClient();
  return useIdempotentMutation<HandlingUnitDetail, Error, MoveHandlingUnitInput>({
    mutationKey: ["inventory", "handling-unit", "move"],
    mutationFn: ({ handlingUnitId, ...data }, idempotencyKey) =>
      apiClient.post<HandlingUnitDetail>(`/inventory/handling-units/${handlingUnitId}/move`, data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.handlingUnitsList });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.handlingUnit(vars.handlingUnitId) });
      // Moving a unit posts stock movements, so every level figure is now stale.
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevelsList });
    },
  });
}

export function useNestHandlingUnit() {
  const qc = useQueryClient();
  return useMutation<HandlingUnitDetail, Error, NestHandlingUnitInput>({
    mutationKey: ["inventory", "handling-unit", "nest"],
    mutationFn: ({ handlingUnitId, ...data }) =>
      apiClient.patch<HandlingUnitDetail>(`/inventory/handling-units/${handlingUnitId}/nesting`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.handlingUnitsList });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.handlingUnit(vars.handlingUnitId) });
      if (vars.parentHuId !== null) {
        qc.invalidateQueries({ queryKey: queryKeys.inventory.handlingUnit(vars.parentHuId) });
      }
    },
  });
}
