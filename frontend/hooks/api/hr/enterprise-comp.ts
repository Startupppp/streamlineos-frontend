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

export interface DeviceMapping {
  id: number;
  deviceId: number;
  userId: string;
  biometricId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
}

export interface VarianceApproval {
  id: number;
  payrollPeriodKey: string;
  variancePct: string;
  thresholdPct: string;
  status: "pending" | "approved" | "rejected";
  approverId: string | null;
  note: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ArrearsAdjustment {
  id: number;
  userId: string;
  reason: string;
  amountCents: number;
  sourcePeriod: string;
  targetPeriod: string;
  status: "pending" | "applied";
  createdBy: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export interface ComplianceTask {
  id: number;
  countryCode: string;
  name: string;
  dueDate: string;
  status: "pending" | "completed" | "overdue";
  notes: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
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
const MAPPINGS_KEY = ["streamlineos", "hr", "enterprise", "comp", "mappings"] as const;

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

export function useIngestSyncLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...SYNC_LOGS_KEY, "ingest"],
    mutationFn: (data: { deviceId: number; status: string; recordsCount: number; error?: string }) =>
      apiClient.post<DeviceSyncLog>("/hr/enterprise/comp/devices/sync-logs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SYNC_LOGS_KEY });
      qc.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

export function useFailedSyncs() {
  return useQuery({
    queryKey: [...SYNC_LOGS_KEY, "failed"],
    queryFn: () => apiClient.get<DeviceSyncLog[]>("/hr/enterprise/comp/devices/failed-syncs"),
    staleTime: 30_000,
  });
}

export function useDeviceMappings(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...MAPPINGS_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<DeviceMapping>>("/hr/enterprise/comp/devices/mappings", { params }),
    staleTime: 5 * 60_000,
  });
}

export function useCreateDeviceMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...MAPPINGS_KEY, "create"],
    mutationFn: (data: { deviceId: number; userId: string; biometricId?: string; effectiveFrom?: string; effectiveTo?: string }) =>
      apiClient.post<DeviceMapping>("/hr/enterprise/comp/devices/mappings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: MAPPINGS_KEY }),
  });
}

// ─── Payroll Compliance Hooks ──────────────────────────────────────────────────

const VARIANCE_KEY = ["streamlineos", "hr", "enterprise", "comp", "variance"] as const;
const ARREARS_KEY = ["streamlineos", "hr", "enterprise", "comp", "arrears"] as const;
const COMPLIANCE_TASKS_KEY = ["streamlineos", "hr", "enterprise", "comp", "complianceTasks"] as const;

export function useVarianceApprovals(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...VARIANCE_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<VarianceApproval>>("/hr/enterprise/comp/payroll-compliance/variance", { params }),
    staleTime: 60_000,
  });
}

export function useResolveVariance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...VARIANCE_KEY, "resolve"],
    mutationFn: ({ id, ...data }: { id: number; action: "approved" | "rejected"; note?: string }) =>
      apiClient.patch<VarianceApproval>(`/hr/enterprise/comp/payroll-compliance/variance/${id}/resolve`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: VARIANCE_KEY }),
  });
}

export function useArrearsAdjustments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...ARREARS_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<ArrearsAdjustment>>("/hr/enterprise/comp/payroll-compliance/arrears", { params }),
    staleTime: 60_000,
  });
}

export function useCreateArrears() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...ARREARS_KEY, "create"],
    mutationFn: (data: { userId: string; reason: string; amountCents: number; sourcePeriod: string; targetPeriod: string }) =>
      apiClient.post<ArrearsAdjustment>("/hr/enterprise/comp/payroll-compliance/arrears", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARREARS_KEY }),
  });
}

export function useApplyArrears() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...ARREARS_KEY, "apply"],
    mutationFn: (id: number) => apiClient.patch(`/hr/enterprise/comp/payroll-compliance/arrears/${id}/apply`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARREARS_KEY }),
  });
}

export function useComplianceTasks(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...COMPLIANCE_TASKS_KEY, params],
    queryFn: () => apiClient.get<PaginatedResponse<ComplianceTask>>("/hr/enterprise/comp/payroll-compliance/tasks", { params }),
    staleTime: 60_000,
  });
}

export function useUpdateComplianceTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...COMPLIANCE_TASKS_KEY, "update"],
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiClient.patch<ComplianceTask>(`/hr/enterprise/comp/payroll-compliance/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPLIANCE_TASKS_KEY }),
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

export function useUpdateCompCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...COMP_CYCLES_KEY, "update"],
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiClient.patch<CompCycle>(`/hr/enterprise/comp/planning/cycles/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMP_CYCLES_KEY });
    },
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

export function useCreateRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...COMP_RECS_KEY, "create"],
    mutationFn: (data: { cycleId: number; userId: string; currentSalaryCents: number; recommendedIncreaseCents: number; recommendedPct: number; rating?: string; managerNote?: string }) =>
      apiClient.post<CompRecommendation>("/hr/enterprise/comp/planning/recommendations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMP_RECS_KEY }),
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

export function useApproveRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...COMP_RECS_KEY, "approve"],
    mutationFn: ({ id, ...data }: { id: number; employmentId: number; effectiveFrom: string }) =>
      apiClient.patch(`/hr/enterprise/comp/planning/recommendations/${id}/approve`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMP_RECS_KEY });
      qc.invalidateQueries({ queryKey: COMP_BUDGET_KEY });
    },
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

export function useEquityGrant(grantId: number) {
  return useQuery({
    queryKey: [...EQUITY_GRANTS_KEY, grantId],
    queryFn: () => apiClient.get<EquityGrant & { vestingEvents: VestingEvent[]; exercises: EquityExercise[] }>(`/hr/enterprise/comp/equity/grants/${grantId}`),
    staleTime: 5 * 60_000,
    enabled: !!grantId,
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

export function useUpdateEquityGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...EQUITY_GRANTS_KEY, "update"],
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiClient.patch<EquityGrant>(`/hr/enterprise/comp/equity/grants/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: EQUITY_GRANTS_KEY });
      qc.invalidateQueries({ queryKey: [...EQUITY_GRANTS_KEY, id as number] });
    },
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

export function useExitTreatment(grantId: number, exitDate: string) {
  return useQuery({
    queryKey: [...EQUITY_GRANTS_KEY, grantId, "exitTreatment", exitDate],
    queryFn: () => apiClient.get<Record<string, unknown>>(`/hr/enterprise/comp/equity/grants/${grantId}/exit-treatment`, { params: { exitDate } }),
    staleTime: 5 * 60_000,
    enabled: !!grantId && !!exitDate,
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

export function useForecastedCost(cycleId: number) {
  return useQuery({
    queryKey: [...COSTING_KEY, "forecasted", cycleId],
    queryFn: () => apiClient.get<Record<string, unknown>>("/hr/enterprise/comp/costing/forecasted", { params: { cycleId } }),
    staleTime: 2 * 60_000,
    enabled: !!cycleId,
  });
}
