"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export interface AffiliateData {
  affiliate: {
    id: number;
    referralCode: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    commissionType: string;
    commissionRate: number;
    totalEarned: number;
    totalPaid: number;
    pendingPayout: number;
    clickCount: number;
    signupCount: number;
  };
  commissions: Array<{
    id: number;
    amountInPaise: number;
    status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
    createdAt: string;
  }>;
}

export function useAffiliate() {
  return useQuery<AffiliateData | null>({
    queryKey: ["billing", "affiliate"],
    queryFn: () => apiClient.get<AffiliateData | null>("/billing/affiliate"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRegisterAffiliate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/billing/affiliate/register", {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "affiliate"] });
      toast.success("Affiliate account created");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to register"),
  });
}

export function useCreateReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post("/billing/referrals", { email }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "referrals"] });
      toast.success("Referral invitation sent");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to send referral"),
  });
}

export function useReferrals() {
  return useQuery({
    queryKey: ["billing", "referrals"],
    queryFn: () => apiClient.get<unknown[]>("/billing/referrals"),
    staleTime: 2 * 60 * 1000,
  });
}
