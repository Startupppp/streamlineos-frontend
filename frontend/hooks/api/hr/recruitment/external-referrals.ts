"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type ExternalReferralStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "HIRED"
  | "REJECTED"
  | "INELIGIBLE"
  | "REWARD_PENDING"
  | "REWARD_PAID";
export type ExternalReferrerStatus = "ACTIVE" | "BLOCKED";

export interface ExternalReferral {
  id: number;
  status: ExternalReferralStatus;
  rewardAmount: string | null;
  rewardPaidAt: string | null;
  ipAddress: string | null;
  createdAt: string;
  candidate: { id: number; firstName: string; lastName: string; email: string } | null;
  referrer: { id: number; name: string; email: string } | null;
  jobPosting: { id: number; title: string } | null;
}

export interface ExternalReferrer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: ExternalReferrerStatus;
  createdAt: string;
  referralCount: number;
}

export interface UpdateExternalReferralInput {
  status?: ExternalReferralStatus;
  rewardAmount?: number;
}

export function useExternalReferrals() {
  return useQuery({
    queryKey: queryKeys.hr.externalReferrals(),
    queryFn: () => apiClient.get<ExternalReferral[]>("/hr/recruitment/external-referrals"),
    staleTime: 60_000,
  });
}

export function useUpdateExternalReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "external-referrals", "update"],
    mutationFn: ({ id, ...data }: { id: number } & UpdateExternalReferralInput) =>
      apiClient.patch<ExternalReferral>(`/hr/recruitment/external-referrals/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.externalReferrals() });
    },
  });
}

export function useExternalReferrers() {
  return useQuery({
    queryKey: queryKeys.hr.externalReferrers(),
    queryFn: () => apiClient.get<ExternalReferrer[]>("/hr/recruitment/external-referrers"),
    staleTime: 60_000,
  });
}

export function useUpdateExternalReferrerStatus(referrerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "external-referrers", "update-status", referrerId],
    mutationFn: (status: ExternalReferrerStatus) =>
      apiClient.patch<ExternalReferrer>(`/hr/recruitment/external-referrers/${referrerId}`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.externalReferrers() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.externalReferrals() });
    },
  });
}
