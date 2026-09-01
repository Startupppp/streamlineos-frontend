"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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

interface CycleCount {
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

interface CycleCountListResponse {
  items: CycleCountListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateCycleCountInput {
  warehouseId: number;
  locationId?: number;
  categoryId?: number;
}

interface UpdateLinesPayload {
  lines: { lineId: number; countedQty: number }[];
}

interface PhysicalAudit {
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

interface PhysicalAuditListResponse {
  items: PhysicalAuditListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreatePhysicalAuditInput {
  warehouseId: number;
}

interface CountsParams {
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
  const canView = useCan("inventory:stock:read");
  return useQuery<CycleCountListResponse, Error>({
    queryKey: queryKeys.inventory.cycleCounts(toApiParams(params)),
    queryFn: ({ signal }) =>
      apiClient.get<CycleCountListResponse>("/inventory/cycle-counts", toApiParams(params), signal),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCycleCount(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<CycleCount, Error>({
    queryKey: queryKeys.inventory.cycleCount(id),
    queryFn: ({ signal }) => apiClient.get<CycleCount>(`/inventory/cycle-counts/${id}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && id > 0,
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
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
    },
  });
}

export function useStartCycleCount() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, number>({
    mutationKey: ["inventory", "cycleCounts", "start"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/start`),
    onSuccess: (_, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
    },
  });
}

export function useUpdateCycleCountLines() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, { countId: number } & UpdateLinesPayload>({
    mutationKey: ["inventory", "cycleCounts", "updateLines"],
    mutationFn: ({ countId, lines }) =>
      apiClient.patch<CycleCount>(`/inventory/cycle-counts/${countId}/lines`, { lines }),
    onSuccess: (_, vars) => {
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
    onSuccess: (_, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
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
    onSuccess: (_, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useCancelCycleCount() {
  const qc = useQueryClient();
  return useMutation<CycleCount, Error, number>({
    mutationKey: ["inventory", "cycleCounts", "cancel"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/cancel`),
    onSuccess: (_, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
    },
  });
}

export function usePhysicalAudits(params?: CountsParams) {
  const canView = useCan("inventory:stock:read");
  return useQuery<PhysicalAuditListResponse, Error>({
    queryKey: queryKeys.inventory.physicalAudits(toApiParams(params)),
    queryFn: ({ signal }) =>
      apiClient.get<PhysicalAuditListResponse>("/inventory/physical-audits", toApiParams(params), signal),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function usePhysicalAudit(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<PhysicalAudit, Error>({
    queryKey: queryKeys.inventory.physicalAudit(id),
    queryFn: ({ signal }) => apiClient.get<PhysicalAudit>(`/inventory/physical-audits/${id}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && id > 0,
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
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
    },
  });
}

export function useStartPhysicalAudit() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, number>({
    mutationKey: ["inventory", "physicalAudits", "start"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/start`),
    onSuccess: (_, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
    },
  });
}

export function useUpdatePhysicalAuditLines() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, { auditId: number } & UpdateLinesPayload>({
    mutationKey: ["inventory", "physicalAudits", "updateLines"],
    mutationFn: ({ auditId, lines }) =>
      apiClient.patch<PhysicalAudit>(`/inventory/physical-audits/${auditId}/lines`, { lines }),
    onSuccess: (_, vars) => {
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
    onSuccess: (_, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
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
    onSuccess: (_, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useCancelPhysicalAudit() {
  const qc = useQueryClient();
  return useMutation<PhysicalAudit, Error, number>({
    mutationKey: ["inventory", "physicalAudits", "cancel"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/cancel`),
    onSuccess: (_, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
    },
  });
}
