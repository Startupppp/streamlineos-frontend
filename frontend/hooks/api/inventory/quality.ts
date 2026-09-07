"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { InspectionStatus, QualityHoldStatus, RecallStatus } from "@/features/inventory/lib";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const listInspectionsContract = lazyContract(() =>
  import("@/hooks/api/inventory/quality-schema").then((m) => m.listInspectionsContract),
);
const inspectionContract = lazyContract(() =>
  import("@/hooks/api/inventory/quality-schema").then((m) => m.createInspectionContract),
);
const listHoldsContract = lazyContract(() =>
  import("@/hooks/api/inventory/quality-schema").then((m) => m.listHoldsContract),
);
const holdContract = lazyContract(() =>
  import("@/hooks/api/inventory/quality-schema").then((m) => m.getHoldContract),
);
const listRecallsContract = lazyContract(() =>
  import("@/hooks/api/inventory/quality-schema").then((m) => m.listRecallsContract),
);
const recallContract = lazyContract(() =>
  import("@/hooks/api/inventory/quality-schema").then((m) => m.getRecallContract),
);

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
  inspectionId: number;
  productVariantId: number;
  lotId: number | null;
  serialId: number | null;
  quantityInspected: string;
  quantityPassed: string | null;
  quantityFailed: string | null;
  disposition: string | null;
  notes: string | null;
  productVariant?: { id: number; name: string; sku: string };
}

interface Inspection {
  id: number;
  orgId: string;
  referenceNumber: string;
  sourceType: string | null;
  sourceId: number | null;
  status: InspectionStatus;
  inspectedBy: string | null;
  inspectedByMembershipId: number | null;
  inspectedAt: string | null;
  notes: string | null;
  createdBy: string;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
  inspector?: { id: string; name: string | null } | null;
  creator?: { id: string; name: string | null };
  lines?: InspectionLine[];
}

type InspectionListResponse = {
  items: Inspection[];
  total: number;
  page: number;
  totalPages: number;
};

interface QualityHold {
  id: number;
  orgId: string;
  productVariantId: number;
  locationId: number | null;
  lotId: number | null;
  quantity: string;
  reason: string;
  notes: string | null;
  status: QualityHoldStatus;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdBy: string;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
  productVariant?: { id: number; name: string; sku: string };
  location?: { id: number; name: string; code: string } | null;
  creator?: { id: string; name: string | null };
}

type HoldListResponse = {
  items: QualityHold[];
  total: number;
  page: number;
  totalPages: number;
};

interface RecallLine {
  id: number;
  recallId: number;
  productVariantId: number;
  lotId: number | null;
  estimatedQty: string | null;
  confirmedQty: string | null;
  status: string;
  notes: string | null;
  productVariant?: { id: number; name: string; sku: string };
}

interface Recall {
  id: number;
  orgId: string;
  referenceNumber: string;
  title: string;
  description: string | null;
  severity: string;
  status: RecallStatus;
  initiatedAt: string | null;
  resolvedAt: string | null;
  createdBy: string;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null };
  lines?: RecallLine[];
}

type RecallListResponse = {
  items: Recall[];
  total: number;
  page: number;
  totalPages: number;
};

export type { Inspection, InspectionLine, QualityHold, Recall, RecallLine };

export function useQualityInspections(filters?: InspectionFilters) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionListResponse, Error>({
    queryKey: queryKeys.inventory.qualityInspections(filters),
    queryFn: ({ signal }) =>
      apiClient.get<InspectionListResponse>("/inventory/quality/inspections", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.variantId ? { variantId: String(filters.variantId) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }, signal, listInspectionsContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useQualityInspection(inspectionId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<Inspection, Error>({
    queryKey: queryKeys.inventory.qualityInspection(inspectionId),
    queryFn: ({ signal }) =>
      apiClient.get<Inspection>(`/inventory/quality/inspections/${inspectionId}`, undefined, signal, inspectionContract),
    staleTime: 60_000,
    enabled: canView && inspectionId > 0,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    Inspection,
    Error,
    { source?: string; lines: { variantId: number; lotId?: number; serialId?: number; qty: number }[] }
  >("inventory:quality:inspect", {
    mutationKey: ["inventory", "quality", "inspection", "create"],
    mutationFn: (data) =>
      apiClient.post<Inspection>("/inventory/quality/inspections", data, undefined, inspectionContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Inspection, Error, number>("inventory:quality:inspect", {
    mutationKey: ["inventory", "quality", "inspection", "start"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/start`, undefined, undefined, inspectionContract),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

export function usePassInspection() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Inspection, Error, number>("inventory:quality:release", {
    mutationKey: ["inventory", "quality", "inspection", "pass"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/pass`,
        undefined,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        inspectionContract,
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
  return useAuthorizedMutation<
    Inspection,
    Error,
    {
      inspectionId: number;
      lines: { lineId: number; disposition: "RELEASE_TO_AVAILABLE" | "QUARANTINE" | "RETURN_TO_VENDOR" | "SCRAP" }[];
    }
  >("inventory:quality:inspect", {
    mutationKey: ["inventory", "quality", "inspection", "fail"],
    mutationFn: ({ inspectionId, lines }) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/fail`, { lines }, undefined, inspectionContract),
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
  return useAuthorizedMutation<
    Inspection,
    Error,
    { inspectionId: number; lineId?: number }
  >("inventory:quality:inspect", {
    mutationKey: ["inventory", "quality", "inspection", "dispose"],
    mutationFn: ({ inspectionId, lineId }) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/dispose`,
        lineId !== undefined ? { lineId } : {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        inspectionContract,
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(vars.inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useCancelInspection() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Inspection, Error, number>("inventory:quality:inspect", {
    mutationKey: ["inventory", "quality", "inspection", "cancel"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/cancel`, undefined, undefined, inspectionContract),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

interface QualityHoldsParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  status?: QualityHoldStatus;
}

export function useQualityHolds(params?: QualityHoldsParams) {
  const canView = useCan("inventory:quality:read");
  return useQuery<HoldListResponse, Error>({
    queryKey: queryKeys.inventory.qualityHolds(params),
    queryFn: ({ signal }) =>
      apiClient.get<HoldListResponse>("/inventory/quality/holds", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal, listHoldsContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useQualityHold(holdId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<QualityHold, Error>({
    queryKey: queryKeys.inventory.qualityHold(holdId),
    queryFn: ({ signal }) => apiClient.get<QualityHold>(`/inventory/quality/holds/${holdId}`, undefined, signal, holdContract),
    staleTime: 60_000,
    enabled: canView && holdId > 0,
  });
}

export function useCreateQualityHold() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    QualityHold,
    Error,
    { productVariantId: number; locationId: number; lotId?: number; serialId?: number; quantity: number; reason: string }
  >("inventory:quality:inspect", {
    mutationKey: ["inventory", "quality", "hold", "create"],
    mutationFn: ({ quantity, ...rest }) =>
      apiClient.post<QualityHold>(
        "/inventory/quality/holds",
        { ...rest, quantity: String(quantity) },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        holdContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useReleaseQualityHold() {
  const qc = useQueryClient();
  return useAuthorizedMutation<QualityHold, Error, number>("inventory:quality:release", {
    mutationKey: ["inventory", "quality", "hold", "release"],
    mutationFn: (holdId) =>
      apiClient.post<QualityHold>(
        `/inventory/quality/holds/${holdId}/release`,
        undefined,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        holdContract,
      ),
    onSuccess: (_, holdId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHold(holdId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

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
      }, signal, listRecallsContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useRecall(recallId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<Recall, Error>({
    queryKey: queryKeys.inventory.recall(recallId),
    queryFn: ({ signal }) => apiClient.get<Recall>(`/inventory/quality/recalls/${recallId}`, undefined, signal, recallContract),
    staleTime: 60_000,
    enabled: canView && recallId > 0,
  });
}

export function useCreateRecall() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    Recall,
    Error,
    { title: string; reason: string; lotIds?: number[]; serialIds?: number[]; severity?: string }
  >("inventory:quality:recall", {
    mutationKey: ["inventory", "quality", "recall", "create"],
    mutationFn: (data) =>
      apiClient.post<Recall>("/inventory/quality/recalls", data, undefined, recallContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recalls() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
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
      apiClient.patch<Recall>(`/inventory/quality/recalls/${recallId}`, data, undefined, recallContract),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recall(vars.recallId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recalls() });
    },
  });
}
