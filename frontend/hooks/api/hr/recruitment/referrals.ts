"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CandidateReferral, CreateReferralInput } from "@/types/hr/recruitment";

export function useAllReferrals() {
  const canEmployees = useCan("hr:employees:view");
  return useQuery({
    queryKey: queryKeys.hr.referrals(),
    queryFn: ({ signal }) => apiClient.get<CandidateReferral[]>("/hr/recruitment/referrals", undefined, signal),
    staleTime: 60_000,
    enabled: canEmployees,
  });
}

export function useSubmitReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "referrals", "submit"],
    mutationFn: (data: CreateReferralInput) =>
      apiClient.post<CandidateReferral>("/hr/recruitment/referrals", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.referrals() });
    },
  });
}

export function useUpdateReferralStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "referrals", "update-status"],
    mutationFn: ({ id, ...data }: { id: number; status?: string; bonusAmount?: number; bonusEligible?: boolean; notes?: string }) =>
      apiClient.patch<CandidateReferral>(`/hr/recruitment/referrals/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.referrals() });
    },
  });
}
