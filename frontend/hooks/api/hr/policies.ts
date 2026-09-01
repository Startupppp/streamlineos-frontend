"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  HrPolicy,
  PoliciesListResponse,
  PolicyPreviewResult,
  CreatePolicyInput,
  UpdatePolicyInput,
  HrPolicyType,
  HrPolicyStatus,
} from "@/types/hr/policies";

export function useHrPolicies(params?: {
  page?: number;
  limit?: number;
  type?: HrPolicyType;
  status?: HrPolicyStatus;
  search?: string;
}) {
  const canView = useCan("hr:policies:view");
  const hrEnabled = useModuleEnabled("hr");
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.type) query.set("type", params.type);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();

  return useQuery({
    queryKey: queryKeys.hr.hrPoliciesList(params),
    queryFn: ({ signal }) =>
      apiClient.get<PoliciesListResponse>(`/hr/policies${qs ? `?${qs}` : ""}`, undefined, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canView && hrEnabled,
  });
}

export function useCreateHrPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr", "policies", "create"],
    mutationFn: (data: CreatePolicyInput) =>
      apiClient.post<HrPolicy>("/hr/policies", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hrPoliciesAll }),
  });
}

export function useUpdateHrPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr", "policies", "update"],
    mutationFn: ({ id, ...data }: UpdatePolicyInput & { id: number }) =>
      apiClient.patch<HrPolicy>(`/hr/policies/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hrPoliciesAll });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hrPolicyDetail(vars.id) });
    },
  });
}

export function useCreatePolicyVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr", "policies", "create-version"],
    mutationFn: (policyId: number) =>
      apiClient.post<HrPolicy>(`/hr/policies/${policyId}/versions`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hrPoliciesAll }),
  });
}

export function useActivatePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr", "policies", "activate"],
    mutationFn: (input: number | { policyId: number; force?: boolean }) => {
      const policyId = typeof input === "number" ? input : input.policyId;
      const force = typeof input === "number" ? false : Boolean(input.force);
      return apiClient.post<HrPolicy>(`/hr/policies/${policyId}/activate`, { force });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.hrPoliciesAll });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.settingsHubVersionsAll });
    },
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
  const canView = useCan("hr:policies:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.hrPoliciesAll, "conflicts", policyId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<{ conflicts: PolicyConflict[]; canActivate: boolean }>(
        `/hr/policies/${policyId}/conflicts`, signal,
      ),
    enabled: canView && hrEnabled && policyId > 0,
    staleTime: 30_000,
  });
}

export function useOrgPolicyConflicts(type?: HrPolicyType) {
  const canView = useCan("hr:policies:view");
  const hrEnabled = useModuleEnabled("hr");
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return useQuery({
    queryKey: [...queryKeys.hr.hrPoliciesAll, "org-conflicts", type] as const,
    queryFn: ({ signal }) =>
      apiClient.get<{ conflicts: PolicyConflict[] }>(`/hr/policies/conflicts${qs}`, undefined, signal),
    staleTime: 30_000,
    enabled: canView && hrEnabled,
  });
}

export function useArchivePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr", "policies", "archive"],
    mutationFn: (policyId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/policies/${policyId}/archive`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hrPoliciesAll }),
  });
}

export function usePolicyPreview(
  policyId: number,
  params: { employeeId: string; date: string } | null,
) {
  const canView = useCan("hr:policies:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.hrPoliciesAll, "preview", policyId, params] as const,
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
    enabled: canView && hrEnabled && !!params?.employeeId && !!params?.date && policyId > 0,
  });
}

export function useSeedDefaultPolicies() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:policies:manage", {
    mutationKey: ["hr", "policies", "seed"],
    mutationFn: () =>
      apiClient.post<{ seeded: boolean; count?: number }>("/hr/policies/seed-defaults", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hrPoliciesAll }),
  });
}
