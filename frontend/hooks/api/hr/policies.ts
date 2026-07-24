"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  HrPolicy,
  PoliciesListResponse,
  PolicyPreviewResult,
  CreatePolicyInput,
  UpdatePolicyInput,
  HrPolicyType,
  HrPolicyStatus,
} from "@/types/hr/policies";

const POLICIES_KEY = ["hr", "policies"] as const;

function policiesListKey(params?: Record<string, unknown>) {
  return [...POLICIES_KEY, "list", params] as const;
}

function policyDetailKey(id: number) {
  return [...POLICIES_KEY, "detail", id] as const;
}

export function useHrPolicies(params?: {
  page?: number;
  limit?: number;
  type?: HrPolicyType;
  status?: HrPolicyStatus;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.type) query.set("type", params.type);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();

  return useQuery({
    queryKey: policiesListKey(params),
    queryFn: () =>
      apiClient.get<PoliciesListResponse>(`/hr/policies${qs ? `?${qs}` : ""}`),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useHrPolicy(policyId: number) {
  return useQuery({
    queryKey: policyDetailKey(policyId),
    queryFn: () => apiClient.get<HrPolicy>(`/hr/policies/${policyId}`),
    staleTime: 60_000,
    enabled: policyId > 0,
  });
}

export function useCreateHrPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "policies", "create"],
    mutationFn: (data: CreatePolicyInput) =>
      apiClient.post<HrPolicy>("/hr/policies", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export function useUpdateHrPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "policies", "update"],
    mutationFn: ({ id, ...data }: UpdatePolicyInput & { id: number }) =>
      apiClient.patch<HrPolicy>(`/hr/policies/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: POLICIES_KEY });
      qc.invalidateQueries({ queryKey: policyDetailKey(vars.id) });
    },
  });
}

export function useCreatePolicyVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "policies", "create-version"],
    mutationFn: (policyId: number) =>
      apiClient.post<HrPolicy>(`/hr/policies/${policyId}/versions`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export function useActivatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "policies", "activate"],
    mutationFn: (input: number | { policyId: number; force?: boolean }) => {
      const policyId = typeof input === "number" ? input : input.policyId;
      const force = typeof input === "number" ? false : Boolean(input.force);
      return apiClient.post<HrPolicy>(`/hr/policies/${policyId}/activate`, { force });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export type PolicyConflict = {
  severity: "blocking" | "warning";
  reason: string;
  policyId: number;
  policyName: string;
  otherPolicyId: number;
  otherPolicyName: string;
  scopeOverlap: Array<{ scopeType: string; scopeValue: string }>;
};

export function usePolicyConflicts(policyId: number) {
  return useQuery({
    queryKey: [...POLICIES_KEY, "conflicts", policyId],
    queryFn: () =>
      apiClient.get<{ conflicts: PolicyConflict[]; canActivate: boolean }>(
        `/hr/policies/${policyId}/conflicts`,
      ),
    enabled: policyId > 0,
    staleTime: 30_000,
  });
}

export function useOrgPolicyConflicts(type?: HrPolicyType) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return useQuery({
    queryKey: [...POLICIES_KEY, "org-conflicts", type],
    queryFn: () =>
      apiClient.get<{ conflicts: PolicyConflict[] }>(`/hr/policies/conflicts${qs}`),
    staleTime: 30_000,
  });
}

export function useSimulatePolicy() {
  return useMutation({
    mutationKey: ["hr", "policies", "simulate"],
    mutationFn: (data: {
      employeeId: string;
      policyType: HrPolicyType;
      date: string;
      rules?: Record<string, unknown>;
    }) =>
      apiClient.post<{
        date: string;
        employeeId: string;
        policyType: string;
        matched: PolicyPreviewResult | null;
        simulatedRules: Record<string, unknown> | null;
        explanation: string;
      }>("/hr/policies/simulate", data),
  });
}

export function useArchivePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "policies", "archive"],
    mutationFn: (policyId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/policies/${policyId}/archive`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export function usePolicyPreview(
  policyId: number,
  params: { employeeId: string; date: string } | null,
) {
  return useQuery({
    queryKey: [...POLICIES_KEY, "preview", policyId, params],
    queryFn: () => {
      const qs = new URLSearchParams({
        employeeId: params!.employeeId,
        date: params!.date,
      });
      return apiClient.get<PolicyPreviewResult | null>(
        `/hr/policies/${policyId}/preview?${qs}`,
      );
    },
    staleTime: 30_000,
    enabled: !!params?.employeeId && !!params?.date && policyId > 0,
  });
}

export function useSeedDefaultPolicies() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "policies", "seed"],
    mutationFn: () =>
      apiClient.post<{ seeded: boolean; count?: number }>("/hr/policies/seed-defaults", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}
