"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const listCycleCountsContract = lazyContract(() =>
  import("@/hooks/api/inventory/counts-schema").then((m) => m.listCycleCountsContract),
);
const cycleCountContract = lazyContract(() =>
  import("@/hooks/api/inventory/counts-schema").then((m) => m.cycleCountContract),
);
const listAuditsContract = lazyContract(() =>
  import("@/hooks/api/inventory/counts-schema").then((m) => m.listAuditsContract),
);
const physicalAuditDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/counts-schema").then((m) => m.physicalAuditDetailContract),
);

export interface CycleCountLine {
  id: number;
  productVariantId: number;
  locationId: number;
  lotId: number | null;
  systemQty: string;
  countedQty: string | null;
  varianceQty: string | null;
  productVariant?: { id: number; name: string; sku: string; product: { id: number; name: string; sku: string } };
  location?: { id: number; name: string; code: string };
}

export type PhysicalAuditLine = CycleCountLine;

interface CycleCount {
  id: number;
  orgId: string;
  countNumber: string;
  warehouseId: number;
  locationId: number | null;
  categoryId: number | null;
  status: string;
  createdBy: string;
  createdByMembershipId: number | null;
  approvedBy: string | null;
  approvedByMembershipId: number | null;
  postedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null };
  lines?: CycleCountLine[];
}

export interface CycleCountListItem {
  id: number;
  orgId: string;
  countNumber: string;
  warehouseId: number;
  locationId: number | null;
  categoryId: number | null;
  status: string;
  createdBy: string;
  createdByMembershipId: number | null;
  approvedBy: string | null;
  approvedByMembershipId: number | null;
  postedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null };
  lines?: CycleCountLine[];
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
  orgId: string;
  auditNumber: string;
  warehouseId: number;
  status: string;
  createdBy: string;
  createdByMembershipId: number | null;
  approvedBy: string | null;
  approvedByMembershipId: number | null;
  postedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null };
  lines?: PhysicalAuditLine[];
}

export interface PhysicalAuditListItem {
  id: number;
  orgId: string;
  auditNumber: string;
  warehouseId: number;
  status: string;
  createdBy: string;
  createdByMembershipId: number | null;
  approvedBy: string | null;
  approvedByMembershipId: number | null;
  postedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null };
  lines?: PhysicalAuditLine[];
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
      apiClient.get<CycleCountListResponse>("/inventory/cycle-counts", toApiParams(params), signal, listCycleCountsContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCycleCount(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<CycleCount, Error>({
    queryKey: queryKeys.inventory.cycleCount(id),
    queryFn: ({ signal }) => apiClient.get<CycleCount>(`/inventory/cycle-counts/${id}`, undefined, signal, cycleCountContract),
    staleTime: 60_000,
    enabled: canView && id > 0,
  });
}

export function useCreateCycleCount() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CycleCount, Error, CreateCycleCountInput>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "cycleCounts", "create"],
    mutationFn: (data) =>
      apiClient.post<CycleCount>("/inventory/cycle-counts", data, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }, cycleCountContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
    },
  });
}

export function useStartCycleCount() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CycleCount, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "cycleCounts", "start"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/start`, undefined, undefined, cycleCountContract),
    onSuccess: (_, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
    },
  });
}

export function useUpdateCycleCountLines() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CycleCount, Error, { countId: number } & UpdateLinesPayload>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "cycleCounts", "updateLines"],
    mutationFn: ({ countId, lines }) =>
      apiClient.patch<CycleCount>(`/inventory/cycle-counts/${countId}/lines`, { lines }, undefined, cycleCountContract),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(vars.countId) });
    },
  });
}

export function useReviewCycleCount() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CycleCount, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "cycleCounts", "review"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/review`, undefined, undefined, cycleCountContract),
    onSuccess: (_, countId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCount(countId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.cycleCounts() });
    },
  });
}

export function usePostCycleCount() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CycleCount, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "cycleCounts", "post"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/post`, undefined, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }, cycleCountContract),
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
  return useAuthorizedMutation<CycleCount, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "cycleCounts", "cancel"],
    mutationFn: (countId) =>
      apiClient.post<CycleCount>(`/inventory/cycle-counts/${countId}/cancel`, undefined, undefined, cycleCountContract),
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
      apiClient.get<PhysicalAuditListResponse>("/inventory/physical-audits", toApiParams(params), signal, listAuditsContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function usePhysicalAudit(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<PhysicalAudit, Error>({
    queryKey: queryKeys.inventory.physicalAudit(id),
    queryFn: ({ signal }) => apiClient.get<PhysicalAudit>(`/inventory/physical-audits/${id}`, undefined, signal, physicalAuditDetailContract),
    staleTime: 60_000,
    enabled: canView && id > 0,
  });
}

export function useCreatePhysicalAudit() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PhysicalAudit, Error, CreatePhysicalAuditInput>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "physicalAudits", "create"],
    mutationFn: (data) =>
      apiClient.post<PhysicalAudit>("/inventory/physical-audits", data, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }, physicalAuditDetailContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
    },
  });
}

export function useStartPhysicalAudit() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PhysicalAudit, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "physicalAudits", "start"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/start`, undefined, undefined, physicalAuditDetailContract),
    onSuccess: (_, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
    },
  });
}

export function useUpdatePhysicalAuditLines() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PhysicalAudit, Error, { auditId: number } & UpdateLinesPayload>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "physicalAudits", "updateLines"],
    mutationFn: ({ auditId, lines }) =>
      apiClient.patch<PhysicalAudit>(`/inventory/physical-audits/${auditId}/lines`, { lines }, undefined, physicalAuditDetailContract),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(vars.auditId) });
    },
  });
}

export function useReviewPhysicalAudit() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PhysicalAudit, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "physicalAudits", "review"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/review`, undefined, undefined, physicalAuditDetailContract),
    onSuccess: (_, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
    },
  });
}

export function usePostPhysicalAudit() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PhysicalAudit, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "physicalAudits", "post"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/post`, undefined, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }, physicalAuditDetailContract),
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
  return useAuthorizedMutation<PhysicalAudit, Error, number>("inventory:stock:reconcile", {
    mutationKey: ["inventory", "physicalAudits", "cancel"],
    mutationFn: (auditId) =>
      apiClient.post<PhysicalAudit>(`/inventory/physical-audits/${auditId}/cancel`, undefined, undefined, physicalAuditDetailContract),
    onSuccess: (_, auditId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudit(auditId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.physicalAudits() });
    },
  });
}
