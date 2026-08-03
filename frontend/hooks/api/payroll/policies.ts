"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  PolicyRow,
  PolicyCurrentResult,
  ToggleImpactResult,
  PolicyPreviewResult,
  ActivateResult,
  VersionRow,
} from "@/types/payroll/setup";

type CreatePolicyInput = {
  country: string;
  state?: string;
  legalEntityName?: string;
  currency: string;
  payFrequency: "MONTHLY" | "SEMI_MONTHLY" | "BI_WEEKLY" | "WEEKLY";
  payDay: number;
  startMonth: string;
};

type UpdatePolicyInput = {
  policyId: number;
  data: Partial<CreatePolicyInput>;
};

type ActivatePolicyInput = {
  policyId: number;
  templateKey?: string;
  templateId?: number;
  toggleOverrides?: Record<string, boolean>;
  payslipLayout?: "CLASSIC" | "MODERN" | "COMPLIANCE";
  calendar?: Record<string, unknown>;
  statutory?: Record<string, unknown>;
  reason?: string;
};

type CreateVersionInput = {
  policyId: number;
  toggleOverrides?: Record<string, boolean>;
  config?: Record<string, unknown>;
  effectiveFrom: string;
  reason: string;
};

type PolicyPreviewInput = {
  templateKey?: string;
  templateId?: number;
  toggleOverrides?: Record<string, boolean>;
  country?: string;
  currency?: string;
  payDay?: number;
  startMonth?: string;
};

export function usePayrollPolicyCurrent() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: queryKeys.payroll.policy(),
    queryFn: () => apiClient.get<PolicyCurrentResult>("/payroll/policies/current"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useToggleImpact(toggle: string, enabled = false) {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: queryKeys.payroll.toggleImpact(toggle),
    queryFn: () =>
      apiClient.get<ToggleImpactResult>("/payroll/policies/toggle-impact", {
        toggle,
      }),
    staleTime: 30_000,
    enabled: enabled && !!toggle && canView,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "policies", "create"],
    mutationFn: (data: CreatePolicyInput) =>
      apiClient.post<PolicyRow>("/payroll/policies", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.policy() }),
  });
}

export function usePreviewPolicy() {
  return useMutation({
    mutationKey: ["payroll", "policies", "preview"],
    mutationFn: (data: PolicyPreviewInput) =>
      apiClient.post<PolicyPreviewResult>("/payroll/policies/preview", data),
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "policies", "update"],
    mutationFn: ({ policyId, data }: UpdatePolicyInput) =>
      apiClient.patch<PolicyRow>(`/payroll/policies/${policyId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.policy() }),
  });
}

export function useActivatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "policies", "activate"],
    mutationFn: ({ policyId, ...data }: ActivatePolicyInput) =>
      apiClient.post<ActivateResult>(
        `/payroll/policies/${policyId}/activate`,
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all }),
  });
}

export function usePolicyVersions(policyId: number, enabled = true) {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: queryKeys.payroll.policyVersions(policyId),
    queryFn: () =>
      apiClient.get<VersionRow[]>(`/payroll/policies/${policyId}/versions`),
    staleTime: 2 * 60_000,
    enabled: enabled && policyId > 0 && canView,
  });
}

export function useCreatePolicyVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "policies", "version", "create"],
    mutationFn: ({ policyId, ...data }: CreateVersionInput) =>
      apiClient.post<VersionRow>(
        `/payroll/policies/${policyId}/versions`,
        data,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.payroll.policyVersions(variables.policyId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.payroll.policy() });
    },
  });
}
