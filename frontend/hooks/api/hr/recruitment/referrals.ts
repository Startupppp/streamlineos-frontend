"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { CandidateReferral, CreateReferralInput } from "@/types/hr/recruitment";

export function useAllReferrals() {
  const canEmployees = useCan("hr:employees:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.referrals(),
    queryFn: ({ signal }) => apiClient.get<CandidateReferral[]>("/hr/recruitment/referrals", undefined, signal),
    staleTime: 60_000,
    enabled: canEmployees,
  });
}

export function useSubmitReferral() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:view", {
    mutationKey: ["hr", "recruitment", "referrals", "submit"],
    mutationFn: (data: CreateReferralInput) =>
      apiClient.post<CandidateReferral>("/hr/recruitment/referrals", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.referrals() });
    },
  });
}

export function useUpdateReferralStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "referrals", "update-status"],
    mutationFn: ({ id, ...data }: { id: number; status?: string; bonusAmount?: number; bonusEligible?: boolean; notes?: string }) =>
      apiClient.patch<CandidateReferral>(`/hr/recruitment/referrals/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.referrals() });
    },
  });
}
