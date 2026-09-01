"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  createdAt: string;
}

export interface AiCreditsUsageTotals {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
  costUsd: number;
}

export interface AiCreditsUsageByFeature {
  feature: string;
  requests: number;
  totalTokens: number;
  credits: number;
  costUsd: number;
}

export interface AiCreditsUsageByModel {
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
  costUsd: number;
}

export interface AiCreditsUsageDaily {
  date: string;
  requests: number;
  totalTokens: number;
  credits: number;
}

export interface AiCreditsUsage {
  totals: AiCreditsUsageTotals;
  byFeature: AiCreditsUsageByFeature[];
  byModel: AiCreditsUsageByModel[];
  daily: AiCreditsUsageDaily[];
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
  const canView = useCan("billing:ai-credits:view");
  return useQuery<AiCreditsWallet>({
    queryKey: queryKeys.billing.aiCredits(),
    queryFn: ({ signal }) => apiClient.get<AiCreditsWallet>("/billing/ai-credits", undefined, signal),
    staleTime: 300_000,
    enabled: canView,
  });
}

export interface AiCreditTransactionsPage {
  data: AiCreditTransaction[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export function useAiCreditTransactions(params: { cursor?: string; limit: number }) {
  const canView = useCan("billing:ai-credits:view");
  return useQuery<AiCreditTransactionsPage>({
    queryKey: queryKeys.billing.aiCreditTransactions(params),
    queryFn: ({ signal }) =>
      apiClient.get<AiCreditTransactionsPage>("/billing/ai-credits/transactions", {
        ...(params.cursor ? { cursor: params.cursor } : {}),
        limit: String(params.limit),
      }, signal),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    enabled: canView,
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
      void qc.invalidateQueries({ queryKey: queryKeys.billing.aiCredits() });
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
  return useMutation<PurchaseAiPackOrder | PurchaseAiPackResult, Error, { packId: number }>({
    mutationKey: ["billing", "ai-credits", "purchase"],
    mutationFn: (data) =>
      apiClient.post<PurchaseAiPackOrder | PurchaseAiPackResult>("/billing/ai-credits/purchase", data),
    onSuccess: (result) => {
      if ("balance" in result) {
        void qc.invalidateQueries({ queryKey: queryKeys.billing.aiCredits() });
        void qc.invalidateQueries({ queryKey: queryKeys.billing.all });
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
    queryKey: queryKeys.billing.aiCreditsUsage(days),
    queryFn: ({ signal }) =>
      apiClient.get<AiCreditsUsage>("/billing/ai-credits/usage", {
        days: String(days),
      }, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
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
      void qc.invalidateQueries({ queryKey: queryKeys.billing.aiCredits() });
      void qc.invalidateQueries({ queryKey: queryKeys.billing.all });
      toast.success(`${result.creditsAdded.toLocaleString()} credits added to your account`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
