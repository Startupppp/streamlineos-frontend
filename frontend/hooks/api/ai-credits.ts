"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

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
    orgId: string;
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
    staleTime: 300_000,
  });
}

export interface AiCreditTransactionsPage {
  items: AiCreditTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

export function useAiCreditTransactions(page: number, limit: number) {
  return useQuery<AiCreditTransactionsPage>({
    queryKey: ["billing", "ai-credits", "transactions", { page, limit }],
    queryFn: () =>
      apiClient.get<AiCreditTransactionsPage>("/billing/ai-credits/transactions", {
        page: String(page),
        limit: String(limit),
      }),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useConfigureAutoTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["billing", "ai-credits", "auto-topup"],
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

export interface PurchaseAiPackOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  pack: AiCreditPack;
}

export interface PurchaseAiPackResult {
  balance: number;
  creditsAdded: number;
  pack: AiCreditPack;
}

export function usePurchaseAiCredits() {
  const qc = useQueryClient();
  return useMutation<PurchaseAiPackOrder | PurchaseAiPackResult, Error, { packId: number }>({
    mutationKey: ["billing", "ai-credits", "purchase"],
    mutationFn: (data) =>
      apiClient.post<PurchaseAiPackOrder | PurchaseAiPackResult>("/billing/ai-credits/purchase", data),
    onSuccess: (result) => {
      if ("balance" in result) {
        void qc.invalidateQueries({ queryKey: ["billing", "ai-credits"] });
        void qc.invalidateQueries({ queryKey: ["billing", "ai-credits", "transactions"] });
        toast.success(`${result.creditsAdded.toLocaleString()} credits added to your account`);
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useVerifyAiCreditPurchase() {
  const qc = useQueryClient();
  return useMutation<
    PurchaseAiPackResult,
    Error,
    { packId: number; orderId: string; paymentId: string; signature: string }
  >({
    mutationKey: ["billing", "ai-credits", "verify"],
    mutationFn: (data) =>
      apiClient.post<PurchaseAiPackResult>("/billing/ai-credits/purchase", data),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["billing", "ai-credits"] });
      void qc.invalidateQueries({ queryKey: ["billing", "ai-credits", "transactions"] });
      toast.success(`${result.creditsAdded.toLocaleString()} credits added to your account`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
