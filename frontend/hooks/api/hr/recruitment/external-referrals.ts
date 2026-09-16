"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const externalReferralListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/external-referrals-schema").then(
    (m) => m.externalReferralListSchema,
  ),
);
const externalReferralRowContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/external-referrals-schema").then(
    (m) => m.externalReferralWithRelationsSchema,
  ),
);
const externalReferrerListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/external-referrals-schema").then(
    (m) => m.externalReferrerListSchema,
  ),
);
const externalReferrerRowContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/external-referrals-schema").then(
    (m) => m.externalReferrerRowSchema,
  ),
);

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
  return useGatedQuery("hr:employees:view", {
    queryKey: humanResourcesQueryKeys.hr.externalReferrals(),
    queryFn: ({ signal }) => apiClient.get<ExternalReferral[]>("/hr/recruitment/external-referrals", undefined, signal, externalReferralListContract),
    staleTime: 60_000,
  });
}

export function useUpdateExternalReferral() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "external-referrals", "update"],
    mutationFn: ({ externalReferralId, ...data }: { externalReferralId: number } & UpdateExternalReferralInput) =>
      apiClient.patch<ExternalReferral>(`/hr/recruitment/external-referrals/${externalReferralId}`, data, undefined, externalReferralRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.externalReferrals() });
    },
  });
}

export function useExternalReferrers() {
  return useGatedQuery("hr:employees:view", {
    queryKey: humanResourcesQueryKeys.hr.externalReferrers(),
    queryFn: ({ signal }) => apiClient.get<ExternalReferrer[]>("/hr/recruitment/external-referrers", undefined, signal, externalReferrerListContract),
    staleTime: 60_000,
  });
}

export function useUpdateExternalReferrerStatus(referrerId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "external-referrers", "update-status", referrerId],
    mutationFn: (status: ExternalReferrerStatus) =>
      apiClient.patch<ExternalReferrer>(`/hr/recruitment/external-referrers/${referrerId}`, { status }, undefined, externalReferrerRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.externalReferrers() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.externalReferrals() });
    },
  });
}
