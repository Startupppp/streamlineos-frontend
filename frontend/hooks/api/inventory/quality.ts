"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { InspectionStatus, QualityHoldStatus, RecallStatus } from "@/features/inventory/lib";

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

interface QualityHold {
  id: number;
  orgId: string;
  status: QualityHoldStatus;
  variantId: number;
  variantName: string;
  locationId?: number | null;
  lotId?: number | null;
  serialId?: number | null;
  qty: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

type HoldListResponse = {
  items: QualityHold[];
  total: number;
  page: number;
  totalPages: number;
};

interface RecallLine {
  id: number;
  lotId?: number | null;
  serialId?: number | null;
  lotNumber?: string | null;
  serialNumber?: string | null;
}

interface AffectedCustomer {
  shipmentId: number;
  salesOrderId?: number | null;
  clientName?: string | null;
  shippedAt?: string | null;
}

interface Recall {
  id: number;
  orgId: string;
  title: string;
  reason: string;
  severity?: string | null;
  status: RecallStatus;
  notes?: string | null;
  lines: RecallLine[];
  affectedCustomers?: AffectedCustomer[];
  createdAt: string;
  updatedAt: string;
}

type RecallListResponse = {
  items: Recall[];
  total: number;
  page: number;
  totalPages: number;
};

export type { Inspection, InspectionLine, QualityHold, Recall };

export function useQualityInspections(filters?: InspectionFilters) {
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
  });
}

export function useQualityInspection(inspectionId: number) {
  return useQuery<InspectionDetail, Error>({
    queryKey: queryKeys.inventory.qualityInspection(inspectionId),
    queryFn: () =>
      apiClient.get<InspectionDetail>(`/inventory/quality/inspections/${inspectionId}`),
    enabled: inspectionId > 0,
    staleTime: 60_000,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation<
    Inspection,
    Error,
    { source?: string; lines: { variantId: number; lotId?: number; serialId?: number; qty: number }[] }
  >({
    mutationKey: ["inventory", "quality", "inspection", "create"],
    mutationFn: (data) =>
      apiClient.post<Inspection>("/inventory/quality/inspections", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "start"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function usePassInspection() {
  const qc = useQueryClient();
  return useMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "pass"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/pass`,
        undefined,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useFailInspection() {
  const qc = useQueryClient();
  return useMutation<
    Inspection,
    Error,
    {
      inspectionId: number;
      lines: { lineId: number; disposition: "RELEASE_TO_AVAILABLE" | "QUARANTINE" | "RETURN_TO_VENDOR" | "SCRAP" }[];
    }
  >({
    mutationKey: ["inventory", "quality", "inspection", "fail"],
    mutationFn: ({ inspectionId, lines }) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/fail`, { lines }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useDisposeInspection() {
  const qc = useQueryClient();
  return useMutation<
    Inspection,
    Error,
    { inspectionId: number; lineId?: number }
  >({
    mutationKey: ["inventory", "quality", "inspection", "dispose"],
    mutationFn: ({ inspectionId, lineId }) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/dispose`,
        lineId !== undefined ? { lineId } : {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useCancelInspection() {
  const qc = useQueryClient();
  return useMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "cancel"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
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
  return useQuery<HoldListResponse, Error>({
    queryKey: queryKeys.inventory.qualityHolds(params),
    queryFn: () =>
      apiClient.get<HoldListResponse>("/inventory/quality/holds", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
  });
}

export function useQualityHold(holdId: number) {
  return useQuery<QualityHold, Error>({
    queryKey: queryKeys.inventory.qualityHold(holdId),
    queryFn: () => apiClient.get<QualityHold>(`/inventory/quality/holds/${holdId}`),
    enabled: holdId > 0,
    staleTime: 60_000,
  });
}

export function useCreateQualityHold() {
  const qc = useQueryClient();
  return useMutation<
    QualityHold,
    Error,
    { variantId: number; locationId?: number; lotId?: number; serialId?: number; qty: number; reason: string }
  >({
    mutationKey: ["inventory", "quality", "hold", "create"],
    mutationFn: (data) =>
      apiClient.post<QualityHold>(
        "/inventory/quality/holds",
        data,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useReleaseQualityHold() {
  const qc = useQueryClient();
  return useMutation<QualityHold, Error, number>({
    mutationKey: ["inventory", "quality", "hold", "release"],
    mutationFn: (holdId) =>
      apiClient.post<QualityHold>(
        `/inventory/quality/holds/${holdId}/release`,
        undefined,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

interface RecallsParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
}

export function useRecalls(params?: RecallsParams) {
  return useQuery<RecallListResponse, Error>({
    queryKey: queryKeys.inventory.recalls(params),
    queryFn: () =>
      apiClient.get<RecallListResponse>("/inventory/quality/recalls", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
  });
}

export function useRecall(recallId: number) {
  return useQuery<Recall, Error>({
    queryKey: queryKeys.inventory.recall(recallId),
    queryFn: () => apiClient.get<Recall>(`/inventory/quality/recalls/${recallId}`),
    enabled: recallId > 0,
    staleTime: 60_000,
  });
}

export function useCreateRecall() {
  const qc = useQueryClient();
  return useMutation<
    Recall,
    Error,
    { title: string; reason: string; lotIds?: number[]; serialIds?: number[]; severity?: string }
  >({
    mutationKey: ["inventory", "quality", "recall", "create"],
    mutationFn: (data) =>
      apiClient.post<Recall>("/inventory/quality/recalls", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateRecall() {
  const qc = useQueryClient();
  return useMutation<
    Recall,
    Error,
    { recallId: number; status?: RecallStatus; notes?: string }
  >({
    mutationKey: ["inventory", "quality", "recall", "update"],
    mutationFn: ({ recallId, ...data }) =>
      apiClient.patch<Recall>(`/inventory/quality/recalls/${recallId}`, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.recall(vars.recallId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.recalls() });
    },
  });
}
