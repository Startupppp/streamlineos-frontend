"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { RecallStatus } from "@/features/inventory/lib";

export * from "./quality-inspections";
export * from "./quality-holds";

interface RecallLine {
  id: number;
  productVariantId?: number | null;
  lotId?: number | null;
  serialId?: number | null;
  status?: string | null;
}

interface AffectedShipment {
  shipmentId: number;
  shipmentNumber: string;
}

interface Recall {
  id: number;
  orgId: string;
  recallNumber: string;
  title: string;
  description?: string | null;
  status: RecallStatus;
  evidenceVersion?: string | null;
  lines: RecallLine[];
  affectedShipments?: AffectedShipment[];
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type RecallListResponse = {
  items: Recall[];
  total: number;
  page: number;
  totalPages: number;
};

export interface RecallSelection {
  [key: string]: unknown;
  lotIds?: number[];
  productVariantIds?: number[];
  vendorId?: number;
  manufacturedFrom?: string;
  manufacturedTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
}

export interface RecallImpactLot {
  lotId: number;
  lotNumber: string;
  productVariantId: number;
  variantSku: string;
  variantName: string;
  status: string;
  manufactureDate: string | null;
  expiryDate: string | null;
}

export interface RecallImpactOnHandRow {
  lotId: number;
  locationId: number;
  locationName: string;
  warehouseId: number;
  warehouseName: string;
  onHand: string;
  qualityHold: string;
}

export interface RecallImpactTransitRow {
  lotId: number;
  transferId: number;
  referenceNumber: string;
  status: string;
  quantity: string;
  fromLocationId: number;
  toLocationId: number;
}

export interface RecallImpactShippedRow {
  lotId: number;
  shipmentId: number;
  shipmentNumber: string;
  status: string;
  shippedAt: string | null;
  salesOrderId: number | null;
  salesOrderNumber: string | null;
  quantity: string;
}

export interface RecallImpactReturnedRow {
  lotId: number;
  returnId: number;
  returnNumber: string;
  status: string;
  quantity: string;
}

export interface RecallImpact {
  selection: RecallSelection;
  warehouseScope: string;
  lots: RecallImpactLot[];
  onHand: RecallImpactOnHandRow[];
  inTransit: RecallImpactTransitRow[];
  shipped: RecallImpactShippedRow[];
  returned: RecallImpactReturnedRow[];
  totals: {
    lots: number;
    onHand: string;
    onQualityHold: string;
    inTransit: string;
    shipped: string;
    returned: string;
  };
  evidenceVersion: string;
}

export type CreateRecallPayload =
  | { title: string; description?: string; selection: RecallSelection; evidenceVersion: string }
  | {
      title: string;
      description?: string;
      lines: { productVariantId?: number; lotId?: number; serialId?: number }[];
    };

export type { Recall };

interface RecallsParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
}

export function useRecalls(params?: RecallsParams) {
  const canView = useCan("inventory:quality:read");
  return useQuery<RecallListResponse, Error>({
    queryKey: queryKeys.inventory.recalls(params),
    queryFn: ({ signal }) =>
      apiClient.get<RecallListResponse>("/inventory/quality/recalls", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useRecall(recallId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<Recall, Error>({
    queryKey: queryKeys.inventory.recall(recallId),
    queryFn: ({ signal }) => apiClient.get<Recall>(`/inventory/quality/recalls/${recallId}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && recallId > 0,
  });
}

export function useSimulateRecall() {
  return useAuthorizedMutation<RecallImpact, Error, RecallSelection>("inventory:quality:read", {
    mutationKey: ["inventory", "quality", "recall", "simulate"],
    mutationFn: (selection) =>
      apiClient.post<RecallImpact>("/inventory/quality/recalls/simulate", { selection }),
  });
}

export function useCreateRecall() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Recall, Error, CreateRecallPayload & { idempotencyKey: string }>("inventory:quality:recall", {
    mutationKey: ["inventory", "quality", "recall", "create"],
    mutationFn: ({ idempotencyKey, ...data }) =>
      apiClient.post<Recall>("/inventory/quality/recalls", data, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recalls() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.lots() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
      void qc.invalidateQueries({ queryKey: queryKeys.recallSimulation.impactList });
    },
  });
}

export function useUpdateRecall() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    Recall,
    Error,
    { recallId: number; status?: RecallStatus; notes?: string }
  >("inventory:quality:recall", {
    mutationKey: ["inventory", "quality", "recall", "update"],
    mutationFn: ({ recallId, ...data }) =>
      apiClient.patch<Recall>(`/inventory/quality/recalls/${recallId}`, data),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recall(vars.recallId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recalls() });
    },
  });
}
