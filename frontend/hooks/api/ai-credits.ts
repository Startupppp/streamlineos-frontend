"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export interface AiCreditPack {
  id: number;
  name: string;
  credits: number;
  bonusCredits: number;
  priceInPaise: number;
  isActive: boolean;
}

export interface AiCreditTransaction {
  id: number;
  type: "PURCHASE" | "USAGE" | "REFUND" | "PLAN_GRANT" | "EXPIRY";
  amount: number;
  balanceAfter: number;
  feature: string | null;
  model: string | null;
  createdAt: string;
}

export interface AiCreditsWallet {
  wallet: {
    id: number;
    orgId: number;
    balance: number;
    lifetimeGranted: number;
    lifetimeConsumed: number;
    autoTopUpEnabled: boolean;
    autoTopUpPackId: number | null;
    autoTopUpThreshold: number | null;
  };
  recentTransactions: AiCreditTransaction[];
  packs: AiCreditPack[];
}

export function useAiCreditsWallet() {
  return useQuery<AiCreditsWallet>({
    queryKey: ["billing", "ai-credits"],
    queryFn: () => apiClient.get<AiCreditsWallet>("/billing/ai-credits"),
    staleTime: 60 * 1000,
  });
}

export function useConfigureAutoTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      enabled: boolean;
      packId?: number;
      threshold?: number;
    }) => apiClient.post("/billing/ai-credits/auto-topup", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "ai-credits"] });
      toast.success("Auto top-up settings saved");
    },
    onError: (e: Error) =>
      toast.error(e.message ?? "Failed to update settings"),
  });
}
