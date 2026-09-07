"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
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

const _listSimulationsContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.listSimulationsContract),
);
const _simulatePolicyContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.simulatePolicyContract),
);
const _simulateLeaveBalanceContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.simulateLeaveBalanceContract),
);
const _simulateApprovalRoutingContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.simulateApprovalRoutingContract),
);
const _simulatePayrollImpactContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.simulatePayrollImpactContract),
);
const _compareSimulationContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.compareSimulationContract),
);

export function useSimulationHistory(params: { cursor?: string; type?: SimulationType } = {}) {
  return useGatedQuery("hr:policies:manage", {
    queryKey: directoryAndOwnershipQueryKeys.hrSimulations.history(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/history`, params as Record<string, unknown>, signal, _listSimulationsContract),
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
    }) => apiClient.post(`${BASE}/simulate/policy`, body, undefined, _simulatePolicyContract),
    onSuccess: () => void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.hrSimulations.all }),
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
    }) => apiClient.post(`${BASE}/simulate/leave-balance`, body, undefined, _simulateLeaveBalanceContract),
    onSuccess: () => void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.hrSimulations.all }),
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
    }) => apiClient.post(`${BASE}/simulate/approval-routing`, body, undefined, _simulateApprovalRoutingContract),
    onSuccess: () => void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.hrSimulations.all }),
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
    }) => apiClient.post(`${BASE}/simulate/payroll-impact`, body, undefined, _simulatePayrollImpactContract),
    onSuccess: () => void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.hrSimulations.all }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useComparePolicy(params: {
  employeeId: string;
  oldPolicyId: number;
  newPolicyId: number;
  policyType: string;
} | null) {
  return useGatedQuery("hr:policies:manage", {
    queryKey: directoryAndOwnershipQueryKeys.hrSimulations.compare(params),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/compare`, params as Record<string, unknown>, signal, _compareSimulationContract),
    enabled: !!params,
    staleTime: 60_000,
  });
}
