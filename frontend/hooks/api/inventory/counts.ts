"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { CycleCountStatus } from "@/features/inventory/lib/inventory-status";

export interface CycleCountLine {
  id: number;
  variantId: number;
  variantSku: string;
  productName: string;
  locationId: number | null;
  locationName: string | null;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
}

export interface CycleCount {
  id: number;
  countNumber: string;
  status: CycleCountStatus;
  warehouseId: number;
  warehouseName: string;
  locationId: number | null;
  locationName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  lines: CycleCountLine[];
  createdAt: string;
  startedAt: string | null;
  postedAt: string | null;
}

export interface CycleCountListItem {
  id: number;
  countNumber: string;
  status: CycleCountStatus;
  warehouseName: string;
  locationName: string | null;
  categoryName: string | null;
  lineCount: number;
  createdAt: string;
}

export interface CycleCountListResponse {
  items: CycleCountListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateCycleCountInput {
  warehouseId: number;
  locationId?: number;
  categoryId?: number;
}

interface UpdateLinesPayload {
  lines: { lineId: number; countedQty: number }[];
}

export interface PhysicalAudit {
  id: number;
  auditNumber: string;
  status: CycleCountStatus;
  warehouseId: number;
  warehouseName: string;
  lines: CycleCountLine[];
  createdAt: string;
  startedAt: string | null;
  postedAt: string | null;
}

export interface PhysicalAuditListItem {
  id: number;
  auditNumber: string;
  status: CycleCountStatus;
  warehouseName: string;
  lineCount: number;
  createdAt: string;
}

export interface PhysicalAuditListResponse {
  items: PhysicalAuditListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreatePhysicalAuditInput {
  warehouseId: number;
}

export interface CountsParams {
  status?: string;
  warehouseId?: number;
  page?: number;
}

function toApiParams(params?: CountsParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (params?.status) out["status"] = params.status;
  if (params?.warehouseId) out["warehouseId"] = params.warehouseId;
  if (params?.page) out["page"] = params.page;
  return out;
}

export function useCycleCounts(params?: CountsParams) {
  return useQuery<CycleCountListResponse, Error>({
    queryKey: queryKeys.inventory.cycleCounts(toApiParams(params)),
    queryFn: () =>
      apiClient.get<CycleCountListResponse>("/inventory/cycle-counts", toApiParams(params)),
    staleTime: 2 * 60_000,
  });
}

export function useCycleCount(id: number) {
  return useQuery<CycleCount, Error>({
    queryKey: queryKeys.inventory.cycleCount(id),
    queryFn: () => apiClient.get<CycleCount>(`/inventory/cycle-counts/${id}`),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

export function useCreateCycleCount() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, CreateCycleCountInput>({
    mutationKey: ["inventory", "cycleCounts", "create"],
    mutationFn: (data) =>
      apiClient.post<CycleCount>("/inventory/cycle-counts", data, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useStartCycleCount() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, number>({
    mutationKey: ["inventory", "cycleCounts", "start"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/start`),
    onSuccess: (_data, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
    },
  });
}

export function useUpdateCycleCountLines() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, { countId: number } & UpdateLinesPayload>({
    mutationKey: ["inventory", "cycleCounts", "updateLines"],
    mutationFn: ({ countId, lines }) =>
      apiClient.patch<CycleCount>(`/inventory/cycle-counts/${countId}/lines`, { lines }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(vars.countId) });
    },
  });
}

export function useReviewCycleCount() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, number>({
    mutationKey: ["inventory", "cycleCounts", "review"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/review`),
    onSuccess: (_data, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
    },
  });
}

export function usePostCycleCount() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, number>({
    mutationKey: ["inventory", "cycleCounts", "post"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/post`, undefined, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: (_data, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
    },
  });
}

export function useCancelCycleCount() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, number>({
    mutationKey: ["inventory", "cycleCounts", "cancel"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/cancel`),
    onSuccess: (_data, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
    },
  });
}

export function usePhysicalAudits(params?: CountsParams) {
  return useQuery<PhysicalAuditListResponse, Error>({
    queryKey: queryKeys.inventory.physicalAudits(toApiParams(params)),
    queryFn: () =>
      apiClient.get<PhysicalAuditListResponse>("/inventory/physical-audits", toApiParams(params)),
    staleTime: 2 * 60_000,
  });
}

export function usePhysicalAudit(id: number) {
  return useQuery<PhysicalAudit, Error>({
    queryKey: queryKeys.inventory.physicalAudit(id),
    queryFn: () => apiClient.get<PhysicalAudit>(`/inventory/physical-audits/${id}`),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

export function useCreatePhysicalAudit() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, CreatePhysicalAuditInput>({
    mutationKey: ["inventory", "physicalAudits", "create"],
    mutationFn: (data) =>
      apiClient.post<PhysicalAudit>("/inventory/physical-audits", data, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useStartPhysicalAudit() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, number>({
    mutationKey: ["inventory", "physicalAudits", "start"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/start`),
    onSuccess: (_data, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
    },
  });
}

export function useUpdatePhysicalAuditLines() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, { auditId: number } & UpdateLinesPayload>({
    mutationKey: ["inventory", "physicalAudits", "updateLines"],
    mutationFn: ({ auditId, lines }) =>
      apiClient.patch<PhysicalAudit>(`/inventory/physical-audits/${auditId}/lines`, { lines }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(vars.auditId) });
    },
  });
}

export function useReviewPhysicalAudit() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, number>({
    mutationKey: ["inventory", "physicalAudits", "review"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/review`),
    onSuccess: (_data, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
    },
  });
}

export function usePostPhysicalAudit() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, number>({
    mutationKey: ["inventory", "physicalAudits", "post"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/post`, undefined, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: (_data, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
    },
  });
}

export function useCancelPhysicalAudit() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, number>({
    mutationKey: ["inventory", "physicalAudits", "cancel"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/cancel`),
    onSuccess: (_data, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
    },
  });
}
