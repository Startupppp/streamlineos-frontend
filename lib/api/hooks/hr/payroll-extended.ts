"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// ─── Salary Revision History ────────────────────────────────────────────────

export function useSalaryRevisionHistory(userId: string) {
  return useQuery({
    queryKey: queryKeys.hr.salaryRevisionHistory(userId),
    queryFn: () =>
      apiClient.get<SalaryRevision[]>(`/hr/salary-structures/${userId}/history`),
    enabled: !!userId,
  });
}

export interface SalaryRevision {
  id: number;
  userId: string;
  previousBasicSalary: string | null;
  newBasicSalary: string;
  previousHraPercentage: string | null;
  newHraPercentage: string;
  previousSpecialAllowance: string | null;
  newSpecialAllowance: string;
  reason: string | null;
  revisedBy: string;
  createdAt: string;
  revisedByUser?: { id: string; name: string | null } | null;
}

export function useReviseSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: { userId: string; basicSalary: number; hraPercentage?: number; specialAllowance?: number; reason?: string }) =>
      apiClient.post<{ success: boolean }>(`/hr/salary-structures/${userId}/revise`, data),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.salaryStructures(v.userId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.salaryRevisionHistory(v.userId) });
    },
  });
}

// ─── Holiday Work Requests ───────────────────────────────────────────────────

export interface HolidayWorkRequest {
  id: number;
  orgId: string;
  userId: string;
  requestDate: string;
  type: "HOLIDAY" | "SUNDAY" | "SATURDAY";
  reason: string | null;
  compensationPreference: "COMP_OFF" | "EXTRA_PAY";
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  user?: { id: string; name: string | null } | null;
  approvedByUser?: { id: string; name: string | null } | null;
}

export function useHolidayWorkRequests(params?: { userId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.hr.holidayWorkRequests(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<HolidayWorkRequest[]>("/hr/holiday-work-requests", params as Record<string, unknown>),
  });
}

export function useSubmitHolidayWorkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestDate: string; reason: string; compensationPreference: "COMP_OFF" | "EXTRA_PAY" }) =>
      apiClient.post<HolidayWorkRequest>("/hr/holiday-work-requests", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.holidayWorkRequests() }),
  });
}

export function useApproveHolidayWorkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<HolidayWorkRequest>(`/hr/holiday-work-requests/${id}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.holidayWorkRequests() }),
  });
}

export function useRejectHolidayWorkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectionReason }: { id: number; rejectionReason: string }) =>
      apiClient.patch<HolidayWorkRequest>(`/hr/holiday-work-requests/${id}/reject`, { rejectionReason }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.holidayWorkRequests() }),
  });
}

// ─── Comp-Off Grants ─────────────────────────────────────────────────────────

export interface CompOffGrant {
  id: number;
  orgId: string;
  userId: string;
  holidayWorkRequestId: number;
  grantedDays: string;
  usedDays: string;
  expiryDate: string;
  status: "ACTIVE" | "EXPIRED" | "USED";
  grantedBy: string;
  createdAt: string;
  holidayWorkRequest?: { id: number; requestDate: string; type: string; compensationPreference: string } | null;
  grantedByUser?: { id: string; name: string | null } | null;
}

export function useCompOffGrants(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.compOffGrants(userId),
    queryFn: () =>
      apiClient.get<CompOffGrant[]>("/hr/comp-off-grants", userId ? { userId } : undefined),
  });
}

export function useGrantCompOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { holidayWorkRequestId: number; grantedDays?: number }) =>
      apiClient.post<CompOffGrant>("/hr/comp-off-grants", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.compOffGrants() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.leaveBalance() });
    },
  });
}

// ─── Late Arrival Warnings ───────────────────────────────────────────────────

export interface LateArrivalWarning {
  id: number;
  orgId: string;
  userId: string;
  date: string;
  warningNumber: number;
  attendanceId: number | null;
  notedBy: string;
  createdAt: string;
  notedByUser?: { id: string; name: string | null } | null;
}

export function useLateArrivalWarnings(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.lateArrivalWarnings(userId),
    queryFn: () =>
      apiClient.get<LateArrivalWarning[]>("/hr/late-arrival-warnings", userId ? { userId } : undefined),
  });
}

export function useLogLateArrivalWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; date: string; attendanceId?: number }) =>
      apiClient.post<LateArrivalWarning>("/hr/late-arrival-warnings", data),
    onSuccess: (_r, v) =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.lateArrivalWarnings(v.userId) }),
  });
}

// ─── Overtime Preview ────────────────────────────────────────────────────────

export interface OvertimePreview {
  userId: string;
  month: string;
  overtimeDays: number;
  overtimeAmount: number;
  dailyRate: number;
  eligibleDates: string[];
}

export function useOvertimePreview(params: { userId: string; month: string }) {
  return useQuery({
    queryKey: queryKeys.hr.overtimePreview(params),
    queryFn: () =>
      apiClient.get<OvertimePreview>("/hr/payrolls/overtime-preview", params as unknown as Record<string, unknown>),
    enabled: !!params.userId && !!params.month,
  });
}
