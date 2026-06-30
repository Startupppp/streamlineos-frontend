"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export interface Referral {
  id: number;
  referralCode: string;
  referredEmail: string;
  status: "PENDING" | "SIGNED_UP" | "ACTIVATED" | "REWARDED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

interface ReferralsResponse {
  referrals: Referral[];
}

const REFERRALS_QUERY_KEY = ["billing", "referrals"] as const;

export function useReferrals() {
  return useQuery<ReferralsResponse, Error>({
    queryKey: REFERRALS_QUERY_KEY,
    queryFn: () => apiClient.get<ReferralsResponse>("/billing/referrals"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateReferral() {
  const qc = useQueryClient();
  return useMutation<Referral, Error, { email: string }>({
    mutationFn: (data) => apiClient.post<Referral>("/billing/referrals", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REFERRALS_QUERY_KEY });
      toast.success("Invitation sent successfully");
    },
    onError: (e) => toast.error(e.message ?? "Failed to send invitation"),
  });
}
