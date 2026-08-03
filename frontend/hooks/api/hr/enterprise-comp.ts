"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Device Hooks ─────────────────────────────────────────────────────────────

const DEVICES_KEY = ["streamlineos", "hr", "enterprise", "comp", "devices"] as const;
const SYNC_LOGS_KEY = ["streamlineos", "hr", "enterprise", "comp", "syncLogs"] as const;

export function useTimeDevices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...DEVICES_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<TimeDevice>>("/hr/enterprise/comp/devices", { params }),
    staleTime: 2 * 60_000,
  });
}

export function useCreateTimeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...DEVICES_KEY, "create"],
    mutationFn: (data: { name: string; serialNumber: string; type: string; locationId?: number; effectiveFrom?: string; effectiveTo?: string }) =>
      apiClient.post<TimeDevice>("/hr/enterprise/comp/devices", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useUpdateTimeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...DEVICES_KEY, "update"],
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiClient.patch<TimeDevice>(`/hr/enterprise/comp/devices/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useDeleteTimeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...DEVICES_KEY, "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/enterprise/comp/devices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useDeviceSyncLogs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...SYNC_LOGS_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<DeviceSyncLog>>("/hr/enterprise/comp/devices/sync-logs", { params }),
    staleTime: 30_000,
  });
}

export function useFailedSyncs() {
  return useQuery({
    queryKey: [...SYNC_LOGS_KEY, "failed"],
    queryFn: () => apiClient.get<DeviceSyncLog[]>("/hr/enterprise/comp/devices/failed-syncs"),
    staleTime: 30_000,
  });
}

// ─── Comp Planning Hooks ──────────────────────────────────────────────────────

const COMP_CYCLES_KEY = ["streamlineos", "hr", "enterprise", "comp", "cycles"] as const;
const COMP_RECS_KEY = ["streamlineos", "hr", "enterprise", "comp", "recommendations"] as const;
const COMP_BUDGET_KEY = ["streamlineos", "hr", "enterprise", "comp", "budgetPools"] as const;

export function useCompCycles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...COMP_CYCLES_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<CompCycle>>("/hr/enterprise/comp/planning/cycles", { params }),
    staleTime: 2 * 60_000,
  });
}

export function useCompCycle(cycleId: number) {
  return useQuery({
    queryKey: [...COMP_CYCLES_KEY, cycleId],
    queryFn: () => apiClient.get<CompCycle>(`/hr/enterprise/comp/planning/cycles/${cycleId}`),
    staleTime: 2 * 60_000,
    enabled: !!cycleId,
  });
}

export function useCreateCompCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...COMP_CYCLES_KEY, "create"],
    mutationFn: (data: { name: string; fiscalYear: number; budgetPoolCents: number; meritMatrix?: Record<string, number> }) =>
      apiClient.post<CompCycle>("/hr/enterprise/comp/planning/cycles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMP_CYCLES_KEY }),
  });
}

export function useCompRecommendations(cycleId?: number, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...COMP_RECS_KEY, cycleId, params],
    queryFn: () => apiClient.get<PaginatedResponse<CompRecommendation>>("/hr/enterprise/comp/planning/recommendations", { params: { ...params, ...(cycleId ? { cycleId } : {}) } }),
    staleTime: 60_000,
    enabled: !!cycleId,
  });
}

export function useCalibrateRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...COMP_RECS_KEY, "calibrate"],
    mutationFn: ({ id, hrCalibratedCents }: { id: number; hrCalibratedCents: number }) =>
      apiClient.patch<CompRecommendation>(`/hr/enterprise/comp/planning/recommendations/${id}/calibrate`, { hrCalibratedCents }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMP_RECS_KEY }),
  });
}

export function useBudgetPools(cycleId: number) {
  return useQuery({
    queryKey: [...COMP_BUDGET_KEY, cycleId],
    queryFn: () => apiClient.get<CompBudgetPool[]>(`/hr/enterprise/comp/planning/cycles/${cycleId}/budget-pools`),
    staleTime: 60_000,
    enabled: !!cycleId,
  });
}

// ─── Equity Hooks ─────────────────────────────────────────────────────────────

const EQUITY_GRANTS_KEY = ["streamlineos", "hr", "enterprise", "comp", "equityGrants"] as const;

export function useEquityGrants(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...EQUITY_GRANTS_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<EquityGrant>>("/hr/enterprise/comp/equity/grants", { params }),
    staleTime: 5 * 60_000,
  });
}

export function useCreateEquityGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...EQUITY_GRANTS_KEY, "create"],
    mutationFn: (data: { userId: string; grantType: string; units: number; strikePriceCents?: number; grantDate: string; cliffMonths: number; vestingMonths: number; documentUrl?: string; notes?: string }) =>
      apiClient.post<EquityGrant & { vestingSchedule: VestingEvent[] }>("/hr/enterprise/comp/equity/grants", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: EQUITY_GRANTS_KEY }),
  });
}

export function useVestingSchedule(grantId: number) {
  return useQuery({
    queryKey: [...EQUITY_GRANTS_KEY, grantId, "vesting"],
    queryFn: () => apiClient.get<VestingEvent[]>(`/hr/enterprise/comp/equity/grants/${grantId}/vesting-schedule`),
    staleTime: 10 * 60_000,
    enabled: !!grantId,
  });
}

export function useRecordExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...EQUITY_GRANTS_KEY, "exercise"],
    mutationFn: (data: { grantId: number; exerciseDate: string; units: number; amountCents: number; notes?: string }) =>
      apiClient.post<EquityExercise>("/hr/enterprise/comp/equity/exercises", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: EQUITY_GRANTS_KEY }),
  });
}

// ─── Workforce Costing Hooks ──────────────────────────────────────────────────

const COSTING_KEY = ["streamlineos", "hr", "enterprise", "comp", "costing"] as const;

export function useWorkforceCostSummary() {
  return useQuery({
    queryKey: [...COSTING_KEY, "summary"],
    queryFn: () => apiClient.get<Record<string, unknown>>("/hr/enterprise/comp/costing/summary"),
    staleTime: 5 * 60_000,
  });
}

export function useCostByDepartment(periodKey: string) {
  return useQuery({
    queryKey: [...COSTING_KEY, "byDepartment", periodKey],
    queryFn: () => apiClient.get<Record<string, unknown>[]>("/hr/enterprise/comp/costing/by-department", { params: { periodKey } }),
    staleTime: 5 * 60_000,
    enabled: !!periodKey,
  });
}

export function useCostByLocation() {
  return useQuery({
    queryKey: [...COSTING_KEY, "byLocation"],
    queryFn: () => apiClient.get<Record<string, unknown>[]>("/hr/enterprise/comp/costing/by-location"),
    staleTime: 5 * 60_000,
  });
}

