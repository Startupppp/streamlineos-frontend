"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { SelfReferral } from "./referrals-schema";

const referralsC = lazyContract(() =>
  import("@/hooks/api/employee-self-service/referrals-schema").then(
    (m) => m.selfReferralsContract,
  ),
);
const referralRowC = lazyContract(() =>
  import("@/hooks/api/employee-self-service/referrals-schema").then(
    (m) => m.selfReferralRowContract,
  ),
);

const referralsKey = ["employee-self-service", "referrals"] as const;

export interface SubmitReferralInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobPostingId?: number;
  relationship?: string;
  notes?: string;
}

export function useSelfReferrals() {
  return useGatedQuery<SelfReferral[]>("self:referrals", {
    queryKey: referralsKey,
    queryFn: ({ signal }) =>
      apiClient.get<SelfReferral[]>(
        "/hr/recruitment/me/referrals",
        undefined,
        signal,
        referralsC,
      ),
    staleTime: 60_000,
  });
}

export function useSubmitReferral() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number }, Error, SubmitReferralInput>(
    "self:referrals",
    {
      mutationKey: ["employee-self-service", "referrals", "create"],
      mutationFn: (input: SubmitReferralInput) =>
        apiClient.post<{ id: number }>(
          "/hr/recruitment/me/referrals",
          input,
          undefined,
          referralRowC,
        ),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: referralsKey });
      },
    },
  );
}
