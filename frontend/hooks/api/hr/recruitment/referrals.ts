"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { CandidateReferral, CreateReferralInput } from "@/types/hr/recruitment";

const allReferralsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/referrals-schema").then((m) => m.allReferralsListContract),
);
const submitReferralC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/referrals-schema").then((m) => m.submitReferralContract),
);
const updateReferralStatusC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/referrals-schema").then((m) => m.updateReferralStatusContract),
);

export function useAllReferrals() {
  const canRequisitions = useCan("hr:requisitions:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.referrals(),
    queryFn: ({ signal }) => apiClient.get<CandidateReferral[]>("/hr/recruitment/referrals", undefined, signal, allReferralsListC),
    staleTime: 60_000,
    enabled: canRequisitions,
  });
}

export function useSubmitReferral() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:view", {
    mutationKey: ["hr", "recruitment", "referrals", "submit"],
    mutationFn: (data: CreateReferralInput) =>
      apiClient.post<CandidateReferral>("/hr/recruitment/referrals", data, undefined, submitReferralC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.referrals() });
    },
  });
}

export function useUpdateReferralStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "referrals", "update-status"],
    mutationFn: ({ referralId, ...data }: { referralId: number; status?: string; bonusAmount?: number; bonusEligible?: boolean; notes?: string }) =>
      apiClient.patch<CandidateReferral>(`/hr/recruitment/referrals/${referralId}`, data, undefined, updateReferralStatusC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.referrals() });
    },
  });
}
