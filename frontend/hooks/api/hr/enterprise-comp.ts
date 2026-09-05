"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";

export interface TimeDevice {
  id: number;
  orgId: string;
  name: string;
  serialNumber: string;
  type: "biometric" | "rfid" | "mobile" | "other";
  locationId: number | null;
  status: "active" | "inactive" | "faulty";
  lastSyncAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
}

export interface DeviceSyncLog {
  id: number;
  deviceId: number;
  status: "success" | "failed" | "partial";
  recordsCount: number;
  error: string | null;
  syncedAt: string;
}

export interface CompCycle {
  id: number;
  name: string;
  fiscalYear: number;
  status: "draft" | "active" | "calibrating" | "approved" | "closed";
  budgetPoolCents: number;
  meritMatrix: Record<string, number> | null;
  createdAt: string;
}

export interface CompRecommendation {
  id: number;
  cycleId: number;
  userId: string;
  currentSalaryCents: number;
  recommendedIncreaseCents: number;
  recommendedPct: string;
  rating: string | null;
  managerNote: string | null;
  hrCalibratedCents: number | null;
  status: "draft" | "submitted" | "calibrated" | "approved";
  createdAt: string;
}

export interface CompBudgetPool {
  id: number;
  cycleId: number;
  departmentId: number | null;
  allocatedCents: number;
  usedCents: number;
  createdAt: string;
}

export interface EquityGrant {
  id: number;
  userId: string;
  grantType: "ISO" | "NSO" | "RSU" | "other";
  units: number;
  strikePriceCents: number | null;
  grantDate: string;
  cliffMonths: number;
  vestingMonths: number;
  status: "active" | "exercised" | "cancelled" | "expired";
  boardApprovedAt: string | null;
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export interface VestingEvent {
  id: number;
  grantId: number;
  vestDate: string;
  unitsVested: number;
  cumulativeVested: number;
}

export interface EquityExercise {
  id: number;
  grantId: number;
  exerciseDate: string;
  units: number;
  amountCents: number;
  notes: string | null;
  createdAt: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const DEVICES_KEY = [...queryKeyBase, "hr", "enterprise", "comp", "devices"] as const;
const SYNC_LOGS_KEY = [...queryKeyBase, "hr", "enterprise", "comp", "syncLogs"] as const;

export function useTimeDevices(params?: Record<string, unknown>) {
  const canManage = useCan("hr:biometric:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrDevicesAll, params],
    queryFn: ({ signal }) => apiClient.get<CursorPaginatedResponse<TimeDevice>>("/hr/enterprise/comp/devices", { params }, signal),
    staleTime: 2 * 60_000,
    enabled: canManage && hrEnabled,
  });
}

export function useCreateTimeDevice() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:biometric:manage", {
    mutationKey: [...DEVICES_KEY, "create"],
    mutationFn: (data: { name: string; serialNumber: string; type: string; locationId?: number; effectiveFrom?: string; effectiveTo?: string }) =>
      apiClient.post<TimeDevice>("/hr/enterprise/comp/devices", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useUpdateTimeDevice() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:biometric:manage", {
    mutationKey: [...DEVICES_KEY, "update"],
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiClient.patch<TimeDevice>(`/hr/enterprise/comp/devices/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useDeleteTimeDevice() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:biometric:manage", {
    mutationKey: [...DEVICES_KEY, "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/enterprise/comp/devices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useDeviceSyncLogs(params?: Record<string, unknown>) {
  const canManage = useCan("hr:biometric:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseSyncLogsAll, params],
    queryFn: ({ signal }) => apiClient.get<CursorPaginatedResponse<DeviceSyncLog>>("/hr/enterprise/comp/devices/sync-logs", { params }, signal),
    staleTime: 30_000,
    enabled: canManage && hrEnabled,
  });
}

export function useFailedSyncs() {
  const canManage = useCan("hr:biometric:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseSyncLogsAll, "failed"],
    queryFn: ({ signal }) => apiClient.get<DeviceSyncLog[]>("/hr/enterprise/comp/devices/failed-syncs", undefined, signal),
    staleTime: 30_000,
    enabled: canManage && hrEnabled,
  });
}

const COMP_CYCLES_KEY = [...queryKeyBase, "hr", "enterprise", "comp", "cycles"] as const;
const COMP_RECS_KEY = [...queryKeyBase, "hr", "enterprise", "comp", "recommendations"] as const;
const COMP_BUDGET_KEY = [...queryKeyBase, "hr", "enterprise", "comp", "budgetPools"] as const;

export function useCompCycles(params?: Record<string, unknown>) {
  const canManage = useCan("hr:compensation:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCompCyclesAll, params],
    queryFn: ({ signal }) => apiClient.get<CursorPaginatedResponse<CompCycle>>("/hr/enterprise/comp/planning/cycles", { params }, signal),
    staleTime: 2 * 60_000,
    enabled: canManage && hrEnabled,
  });
}

export function useCompCycle(cycleId: number) {
  const canManage = useCan("hr:compensation:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCompCyclesAll, cycleId],
    queryFn: ({ signal }) => apiClient.get<CompCycle>(`/hr/enterprise/comp/planning/cycles/${cycleId}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: !!cycleId && canManage && hrEnabled,
  });
}

export function useCreateCompCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compensation:manage", {
    mutationKey: [...COMP_CYCLES_KEY, "create"],
    mutationFn: (data: { name: string; fiscalYear: number; budgetPoolCents: number; meritMatrix?: Record<string, number> }) =>
      apiClient.post<CompCycle>("/hr/enterprise/comp/planning/cycles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMP_CYCLES_KEY }),
  });
}

export function useCompRecommendations(cycleId?: number, params?: Record<string, unknown>) {
  const canManage = useCan("hr:compensation:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCompRecsAll, cycleId, params],
    queryFn: ({ signal }) => apiClient.get<CursorPaginatedResponse<CompRecommendation>>("/hr/enterprise/comp/planning/recommendations", { params: { ...params, ...(cycleId ? { cycleId } : {}) } }, signal),
    staleTime: 60_000,
    enabled: !!cycleId && canManage && hrEnabled,
  });
}

export function useCalibrateRecommendation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:compensation:manage", {
    mutationKey: [...COMP_RECS_KEY, "calibrate"],
    mutationFn: ({ id, hrCalibratedCents }: { id: number; hrCalibratedCents: number }) =>
      apiClient.patch<CompRecommendation>(`/hr/enterprise/comp/planning/recommendations/${id}/calibrate`, { hrCalibratedCents }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMP_RECS_KEY }),
  });
}

export function useBudgetPools(cycleId: number) {
  const canManage = useCan("hr:compensation:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCompBudgetAll, cycleId],
    queryFn: ({ signal }) => apiClient.get<CompBudgetPool[]>(`/hr/enterprise/comp/planning/cycles/${cycleId}/budget-pools`, undefined, signal),
    staleTime: 60_000,
    enabled: !!cycleId && canManage && hrEnabled,
  });
}

const EQUITY_GRANTS_KEY = [...queryKeyBase, "hr", "enterprise", "comp", "equityGrants"] as const;

export function useEquityGrants(params?: Record<string, unknown>) {
  const canView = useCan("hr:equity:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseEquityGrantsAll, params],
    queryFn: ({ signal }) => apiClient.get<CursorPaginatedResponse<EquityGrant>>("/hr/enterprise/comp/equity/grants", { params }, signal),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateEquityGrant() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:equity:manage", {
    mutationKey: [...EQUITY_GRANTS_KEY, "create"],
    mutationFn: (data: { userId: string; grantType: string; units: number; strikePriceCents?: number; grantDate: string; cliffMonths: number; vestingMonths: number; documentUrl?: string; notes?: string }) =>
      apiClient.post<EquityGrant & { vestingSchedule: VestingEvent[] }>("/hr/enterprise/comp/equity/grants", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: EQUITY_GRANTS_KEY }),
  });
}

export function useVestingSchedule(grantId: number) {
  const canView = useCan("hr:equity:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseEquityGrantsAll, grantId, "vesting"],
    queryFn: ({ signal }) => apiClient.get<VestingEvent[]>(`/hr/enterprise/comp/equity/grants/${grantId}/vesting-schedule`, undefined, signal),
    staleTime: 10 * 60_000,
    enabled: !!grantId && canView && hrEnabled,
  });
}

export function useRecordExercise() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:equity:manage", {
    mutationKey: [...EQUITY_GRANTS_KEY, "exercise"],
    mutationFn: (data: { grantId: number; exerciseDate: string; units: number; amountCents: number; notes?: string }) =>
      apiClient.post<EquityExercise>("/hr/enterprise/comp/equity/exercises", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: EQUITY_GRANTS_KEY }),
  });
}

const COSTING_KEY = [...queryKeyBase, "hr", "enterprise", "comp", "costing"] as const;

export function useWorkforceCostSummary() {
  const canRead = useCan("hr:analytics:read");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCostingAll, "summary"],
    queryFn: ({ signal }) => apiClient.get<Record<string, unknown>>("/hr/enterprise/comp/costing/summary", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canRead && hrEnabled,
  });
}

export function useCostByDepartment(periodKey: string) {
  const canRead = useCan("hr:analytics:read");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCostingAll, "byDepartment", periodKey],
    queryFn: ({ signal }) => apiClient.get<Record<string, unknown>[]>("/hr/enterprise/comp/costing/by-department", { params: { periodKey } }, signal),
    staleTime: 5 * 60_000,
    enabled: !!periodKey && canRead && hrEnabled,
  });
}

export function useCostByLocation() {
  const canRead = useCan("hr:analytics:read");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCostingAll, "byLocation"],
    queryFn: ({ signal }) => apiClient.get<Record<string, unknown>[]>("/hr/enterprise/comp/costing/by-location", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canRead && hrEnabled,
  });
}

