"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

export type HrPayrollInputStatus = "open" | "building" | "built" | "locked";

export type HrPayrollInputSection =
  | "employee_master"
  | "compensation"
  | "attendance"
  | "leave"
  | "overtime"
  | "reimbursement"
  | "deduction"
  | "lifecycle";

export type HrPayrollAdjustmentType = "arrears" | "recovery" | "correction";
export type HrPayrollAdjustmentStatus = "pending" | "approved" | "applied";

export interface PayrollInputPeriod {
  id: number;
  orgId: string;
  periodKey: string;
  status: HrPayrollInputStatus;
  cutoffDate: string | null;
  builtAt: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollInputSnapshot {
  id: number;
  userId: string;
  section: HrPayrollInputSection;
  payload: Record<string, unknown>;
  sourceRefs: Array<{ table: string; id: number | string }> | null;
  createdAt: string;
  userName: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string;
}

export interface PayrollAdjustment {
  id: number;
  userId: string;
  adjustmentType: HrPayrollAdjustmentType;
  section: HrPayrollInputSection;
  amountCents: number | null;
  days: string | null;
  reason: string;
  status: HrPayrollAdjustmentStatus;
  createdAt: string;
  userName: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedPeriods {
  data: PayrollInputPeriod[];
  pagination: Pagination;
}

interface PaginatedSnapshots {
  data: PayrollInputSnapshot[];
  pagination: Pagination;
}

interface PaginatedAdjustments {
  data: PayrollAdjustment[];
  pagination: Pagination;
}

interface SectionParams {
  page?: number;
  limit?: number;
  preview?: boolean;
}

export function usePayrollInputPeriods(params?: { page?: number; limit?: number; status?: HrPayrollInputStatus }) {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: queryKeys.hrPayrollInputs.periods(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedPeriods>("/hr/payroll-inputs/periods", params as Record<string, string | number> | undefined),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreatePayrollInputPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-payroll-inputs", "periods", "create"],
    mutationFn: (data: { periodKey: string; cutoffDate?: string }) =>
      apiClient.post<PayrollInputPeriod>("/hr/payroll-inputs/periods", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.periods() });
      toast.success("Period created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useBuildPayrollInputPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-payroll-inputs", "periods", "build"],
    mutationFn: (periodId: number) =>
      apiClient.post<PayrollInputPeriod>(`/hr/payroll-inputs/periods/${periodId}/build`),
    onSuccess: (_data, periodId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.period(periodId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.periods() });
      toast.success("Period built — snapshots captured");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useLockPayrollInputPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-payroll-inputs", "periods", "lock"],
    mutationFn: (periodId: number) =>
      apiClient.post<PayrollInputPeriod>(`/hr/payroll-inputs/periods/${periodId}/lock`),
    onSuccess: (_data, periodId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.period(periodId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.periods() });
      toast.success("Period locked");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUnlockPayrollInputPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-payroll-inputs", "periods", "unlock"],
    mutationFn: (periodId: number) =>
      apiClient.post<PayrollInputPeriod>(`/hr/payroll-inputs/periods/${periodId}/unlock`),
    onSuccess: (_data, periodId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.period(periodId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.periods() });
      toast.success("Period unlocked");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

function makeSectionHook(section: string) {
  return function useSectionSnapshot(periodId: number, params?: SectionParams, enabled = true) {
    const canView = useCan("hr:payroll:view");
    const queryParams = {
      ...(params?.page !== undefined && { page: params.page }),
      ...(params?.limit !== undefined && { limit: params.limit }),
      ...(params?.preview && { preview: "true" }),
    };
    return useQuery({
      queryKey: queryKeys.hrPayrollInputs.section(periodId, section, queryParams),
      queryFn: () =>
        apiClient.get<PaginatedSnapshots>(`/hr/payroll-inputs/periods/${periodId}/${section}`, queryParams as Record<string, string | number>),
      staleTime: 60_000,
      enabled: enabled && periodId > 0 && canView,
    });
  };
}

export const useAttendanceSnapshot = makeSectionHook("attendance");
export const useLeaveSnapshot = makeSectionHook("leaves");
export const useOvertimeSnapshot = makeSectionHook("overtime");
export const useReimbursementSnapshot = makeSectionHook("reimbursements");

export function usePayrollAdjustments(periodId: number, params?: { page?: number; limit?: number }) {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: queryKeys.hrPayrollInputs.adjustments(periodId, params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedAdjustments>(
        `/hr/payroll-inputs/periods/${periodId}/adjustments`,
        params as Record<string, string | number> | undefined,
      ),
    staleTime: 30_000,
    enabled: canView && periodId > 0,
  });
}

export function useCreatePayrollAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-payroll-inputs", "adjustments", "create"],
    mutationFn: (data: {
      periodId?: number;
      userId: string;
      adjustmentType: HrPayrollAdjustmentType;
      section: HrPayrollInputSection;
      amountCents?: number;
      days?: number;
      reason: string;
      sourceChangeRef?: Record<string, unknown>;
    }) => apiClient.post<PayrollAdjustment>("/hr/payroll-inputs/adjustments", data),
    onSuccess: (_data, vars) => {
      if (vars.periodId) {
        void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.adjustments(vars.periodId) });
      }
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.all });
      toast.success("Adjustment created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useApprovePayrollAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-payroll-inputs", "adjustments", "approve"],
    mutationFn: (adjustmentId: number) =>
      apiClient.patch<PayrollAdjustment>(`/hr/payroll-inputs/adjustments/${adjustmentId}/approve`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrPayrollInputs.all });
      toast.success("Adjustment approved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
