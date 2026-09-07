"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  PolicyRow,
  PolicyCurrentResult,
  ToggleImpactResult,
  PolicyPreviewResult,
  ActivateResult,
  VersionRow,
} from "@/types/payroll/setup";
import { policyPreviewContract } from "@/hooks/api/payroll/setup-preview-schema";

const policyCurrentC = lazyContract(() =>
  import("@/hooks/api/payroll/policies-schema").then((m) => m.policyCurrentResponseContract),
);
const policyToggleImpactC = lazyContract(() =>
  import("@/hooks/api/payroll/policies-schema").then((m) => m.policyToggleImpactResponseContract),
);
const payrollPolicyRowC = lazyContract(() =>
  import("@/hooks/api/payroll/policies-schema").then((m) => m.payrollPolicyRowContract),
);
const policyActivateC = lazyContract(() =>
  import("@/hooks/api/payroll/policies-schema").then((m) => m.policyActivateResponseContract),
);
const policyVersionsListC = lazyContract(() =>
  import("@/hooks/api/payroll/policies-schema").then((m) => m.policyVersionsListResponseContract),
);
const payrollPolicyVersionRowC = lazyContract(() =>
  import("@/hooks/api/payroll/policies-schema").then((m) => m.payrollPolicyVersionRowContract),
);

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
  payDay?: number;
  startMonth?: string;
};

export function usePayrollPolicyCurrent() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.policy(),
    queryFn: ({ signal }) => apiClient.get("/payroll/policies/current", undefined, signal, policyCurrentC),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useToggleImpact(toggle: string, enabled = false) {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.toggleImpact(toggle),
    queryFn: ({ signal }) =>
      apiClient.get("/payroll/policies/toggle-impact", {
        toggle,
      }, signal, policyToggleImpactC),
    staleTime: 30_000,
    enabled: enabled && !!toggle && canView,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:policies:manage", {
    mutationKey: ["payroll", "policies", "create"],
    mutationFn: (data: CreatePolicyInput) =>
      apiClient.post<PolicyRow>("/payroll/policies", data, undefined, payrollPolicyRowC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.policy() }),
  });
}

export function usePreviewPolicy() {
  return useAuthorizedMutation("payroll:policies:view", {
    mutationKey: ["payroll", "policies", "preview"],
    mutationFn: (data: PolicyPreviewInput) =>
      apiClient.post<PolicyPreviewResult>(
        "/payroll/policies/preview",
        data,
        undefined,
        policyPreviewContract,
      ),
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:policies:manage", {
    mutationKey: ["payroll", "policies", "update"],
    mutationFn: ({ policyId, data }: UpdatePolicyInput) =>
      apiClient.patch<PolicyRow>(`/payroll/policies/${policyId}`, data, undefined, payrollPolicyRowC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.policy() }),
  });
}

export function useActivatePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:policies:manage", {
    mutationKey: ["payroll", "policies", "activate"],
    mutationFn: ({ policyId, ...data }: ActivatePolicyInput) =>
      apiClient.post(
        `/payroll/policies/${policyId}/activate`,
        data,
        undefined,
        policyActivateC,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.all }),
  });
}

export function usePolicyVersions(policyId: number, enabled = true) {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.policyVersions(policyId),
    queryFn: ({ signal }) =>
      apiClient.get(`/payroll/policies/${policyId}/versions`, undefined, signal, policyVersionsListC),
    staleTime: 2 * 60_000,
    enabled: enabled && policyId > 0 && canView,
  });
}

export function useCreatePolicyVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:policies:manage", {
    mutationKey: ["payroll", "policies", "version", "create"],
    mutationFn: ({ policyId, ...data }: CreateVersionInput) =>
      apiClient.post(
        `/payroll/policies/${policyId}/versions`,
        data,
        undefined,
        payrollPolicyVersionRowC,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: payrollQueryKeys.payroll.policyVersions(variables.policyId),
      });
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.policy() });
    },
  });
}
