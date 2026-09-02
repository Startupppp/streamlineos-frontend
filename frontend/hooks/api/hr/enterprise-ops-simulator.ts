"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export type SimulationType = "policy" | "leave" | "attendance" | "approval" | "payroll";

export interface SimulationRecord {
  id: string;
  orgId: string;
  type: SimulationType;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const BASE = "/hr/enterprise/ops/simulator";

export function useSimulationHistory(params: { cursor?: string; type?: SimulationType } = {}) {
  return useQuery({
    queryKey: queryKeys.hrSimulations.history(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<SimulationRecord>>(`${BASE}/history`, params as Record<string, unknown>, signal),
    staleTime: 30_000,
  });
}

export function useSimulatePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr-simulations", "policy"],
    mutationFn: (body: {
      employeeId: string;
      policyType: string;
      hypotheticalContext: Record<string, unknown>;
    }) => apiClient.post<Record<string, unknown>>(`${BASE}/simulate/policy`, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.hrSimulations.all }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSimulateLeaveBalance() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr-simulations", "leave"],
    mutationFn: (body: {
      employeeId: string;
      leaveTypeId: number;
      hypotheticalAccrualRate?: number;
      projectionDate: string;
    }) => apiClient.post<Record<string, unknown>>(`${BASE}/simulate/leave-balance`, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.hrSimulations.all }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSimulateApprovalRouting() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr-simulations", "approval"],
    mutationFn: (body: {
      objectType: string;
      hypotheticalContext: Record<string, unknown>;
      employeeId: string;
    }) => apiClient.post<Record<string, unknown>>(`${BASE}/simulate/approval-routing`, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.hrSimulations.all }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSimulatePayrollImpact() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr-simulations", "payroll"],
    mutationFn: (body: {
      employeeId: string;
      hypotheticalComponents: Array<{ name: string; amount: number; type: "earning" | "deduction" }>;
      effectiveDate: string;
    }) => apiClient.post<Record<string, unknown>>(`${BASE}/simulate/payroll-impact`, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.hrSimulations.all }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useComparePolicy(params: {
  employeeId: string;
  oldPolicyId: number;
  newPolicyId: number;
  policyType: string;
} | null) {
  return useQuery({
    queryKey: queryKeys.hrSimulations.compare(params),
    queryFn: ({ signal }) => apiClient.get<Record<string, unknown>>(`${BASE}/compare`, params as Record<string, unknown>, signal),
    enabled: !!params,
    staleTime: 60_000,
  });
}
