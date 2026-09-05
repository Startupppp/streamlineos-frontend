"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  aiCreditsUsageContract,
  aiCreditsWalletContract,
  aiCreditTransactionsPageContract,
  type AiCreditPack,
  type AiCreditsUsage,
  type AiCreditsWallet,
  type AiCreditTransactionsPage,
} from "@/hooks/api/ai-credits-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type {
  AiCreditPack,
  AiCreditTransaction,
  AiCreditTransactionsPage,
  AiCreditsUsage,
  AiCreditsUsageByFeature,
  AiCreditsUsageByModel,
  AiCreditsUsageDaily,
  AiCreditsWallet,
} from "@/hooks/api/ai-credits-schema";

export function useAiCreditsWallet() {
  const canView = useCan("billing:ai-credits:view");
  return useQuery<AiCreditsWallet>({
    queryKey: growthAndSignQueryKeys.billing.aiCredits(),
    queryFn: ({ signal }) =>
      apiClient.get("/billing/ai-credits", undefined, signal, aiCreditsWalletContract),
    staleTime: 300_000,
    enabled: canView,
  });
}

export function useAiCreditTransactions(params: { cursor?: string; limit: number }) {
  const canView = useCan("billing:ai-credits:view");
  return useQuery<AiCreditTransactionsPage>({
    queryKey: growthAndSignQueryKeys.billing.aiCreditTransactions(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/billing/ai-credits/transactions",
        {
          ...(params.cursor ? { cursor: params.cursor } : {}),
          limit: String(params.limit),
        },
        signal,
        aiCreditTransactionsPageContract,
      ),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useConfigureAutoTopUp() {
  const qc = useQueryClient();
  return useAuthorizedMutation("billing:ai-credits:purchase", {
    mutationKey: ["billing", "ai-credits", "auto-topup"],
    mutationFn: (data: {
      enabled: boolean;
      packId?: number;
      threshold?: number;
    }) => apiClient.post("/billing/ai-credits/auto-topup", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.aiCredits() });
      toast.success("Auto top-up settings saved");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export interface PurchaseAiPackOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
  pack: AiCreditPack;
}

export interface PurchaseAiPackResult {
  balance: number;
  creditsAdded: number;
  pack: AiCreditPack;
}

export function usePurchaseAiCredits() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PurchaseAiPackOrder | PurchaseAiPackResult, Error, { packId: number }>("billing:ai-credits:purchase", {
    mutationKey: ["billing", "ai-credits", "purchase"],
    mutationFn: (data) =>
      apiClient.post<PurchaseAiPackOrder | PurchaseAiPackResult>("/billing/ai-credits/purchase", data),
    onSuccess: (result) => {
      if ("balance" in result) {
        void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.aiCredits() });
        void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.all });
        toast.success(`${result.creditsAdded.toLocaleString()} credits added to your account`);
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export type AiCreditsUsageDays = 7 | 30 | 90;

export function useAiCreditsUsage(days: AiCreditsUsageDays) {
  const canView = useCan("billing:ai-credits:view");
  return useQuery<AiCreditsUsage>({
    queryKey: growthAndSignQueryKeys.billing.aiCreditsUsage(days),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/billing/ai-credits/usage",
        { days: String(days) },
        signal,
        aiCreditsUsageContract,
      ),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useVerifyAiCreditPurchase() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    PurchaseAiPackResult,
    Error,
    { packId: number; orderId: string; paymentId: string; signature: string }
  >("billing:ai-credits:purchase", {
    mutationKey: ["billing", "ai-credits", "verify"],
    mutationFn: (data) =>
      apiClient.post<PurchaseAiPackResult>("/billing/ai-credits/purchase", data),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.aiCredits() });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.all });
      toast.success(`${result.creditsAdded.toLocaleString()} credits added to your account`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
