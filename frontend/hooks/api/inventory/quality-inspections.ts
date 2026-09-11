"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { InspectionStatus } from "@/features/inventory/lib";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

interface InspectionFilters {
  [key: string]: unknown;
  status?: InspectionStatus;
  source?: string;
  variantId?: number;
  page?: number;
  limit?: number;
}

interface InspectionLine {
  id: number;
  variantId: number;
  variantName: string;
  lotId?: number | null;
  serialId?: number | null;
  qty: number;
  disposition?: string | null;
  /** D3. What this inspection is holding out of ATP right now. */
  heldQuantity?: string | null;
  /** How many units the governing plan requires be opened. */
  sampleQuantity?: string | null;
  locationId?: number | null;
  planVersionId?: number | null;
}

interface TimelineEntry {
  status: InspectionStatus;
  at: string;
}

interface Inspection {
  id: number;
  orgId: string;
  status: InspectionStatus;
  source: string | null;
  lines: InspectionLine[];
  statusTimeline?: TimelineEntry[];
  /** Set on a compensating correction; the original stays untouched. */
  correctsInspectionId?: number | null;
  correctionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InspectionDetail extends Inspection {
  statusTimeline: TimelineEntry[];
}

type InspectionListResponse = {
  items: Inspection[];
  total: number;
  page: number;
  totalPages: number;
};

export type { Inspection, InspectionLine };

export function useQualityInspections(filters?: InspectionFilters) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionListResponse, Error>({
    queryKey: queryKeys.inventory.qualityInspections(filters),
    queryFn: () =>
      apiClient.get<InspectionListResponse>("/inventory/quality/inspections", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.variantId ? { variantId: String(filters.variantId) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useQualityInspection(inspectionId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionDetail, Error>({
    queryKey: queryKeys.inventory.qualityInspection(inspectionId),
    queryFn: () =>
      apiClient.get<InspectionDetail>(`/inventory/quality/inspections/${inspectionId}`),
    staleTime: 60_000,
    enabled: canView && inspectionId > 0,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    Inspection,
    Error,
    { source?: string; lines: { variantId: number; lotId?: number; serialId?: number; qty: number }[] }
  >({
    mutationKey: ["inventory", "quality", "inspection", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<Inspection>("/inventory/quality/inspections", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useIdempotentMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "start"],
    mutationFn: (inspectionId, idempotencyKey) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/start`, undefined, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

export function usePassInspection() {
  const qc = useQueryClient();
  return useIdempotentMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "pass"],
    mutationFn: (inspectionId, idempotencyKey) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/pass`,
        undefined, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useFailInspection() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    Inspection,
    Error,
    {
      inspectionId: number;
      lines: { lineId: number; disposition: "RELEASE_TO_AVAILABLE" | "QUARANTINE" | "RETURN_TO_VENDOR" | "SCRAP" }[];
    }
  >({
    mutationKey: ["inventory", "quality", "inspection", "fail"],
    mutationFn: ({ inspectionId, lines }, idempotencyKey) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/fail`, { lines }, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(vars.inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useDisposeInspection() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    Inspection,
    Error,
    { inspectionId: number; lineId?: number }
  >({
    mutationKey: ["inventory", "quality", "inspection", "dispose"],
    mutationFn: ({ inspectionId, lineId }, idempotencyKey) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/dispose`,
        lineId !== undefined ? { lineId } : {}, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(vars.inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

/**
 * D3. Cancelling hands back whatever the inspection was holding, so it moves
 * stock — hence the idempotency key and the stock invalidations, neither of
 * which it needed while a cancel was a pure status flip.
 */
export function useCancelInspection() {
  const qc = useQueryClient();
  return useIdempotentMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "cancel"],
    mutationFn: (inspectionId, idempotencyKey) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/cancel`,
        undefined, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

/**
 * D3. A completed result is evidence and is never edited — correcting one raises
 * a fresh inspection that names what it supersedes, and both stay readable.
 */
export function useCorrectInspection() {
  const qc = useQueryClient();
  return useIdempotentMutation<Inspection, Error, { inspectionId: number; reason: string }>({
    mutationKey: ["inventory", "quality", "inspection", "correct"],
    mutationFn: ({ inspectionId, reason }, idempotencyKey) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/correct`,
        { reason }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.inventory.qualityInspection(variables.inspectionId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}
