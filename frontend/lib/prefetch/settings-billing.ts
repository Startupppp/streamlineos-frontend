import "server-only";

import { dehydrate, type QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate, type PrefetchGate } from "./prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import {
  aiCreditTransactionsPageContract,
  aiCreditsUsageContract,
  aiCreditsWalletContract,
} from "@/hooks/api/ai-credits-schema";
import type { BillingTab } from "@/features/billing/billing-tabs";
import {
  AI_CREDITS_USAGE_DAYS,
  AI_CREDIT_TRANSACTION_PARAMS,
} from "@/lib/settings-initial-reads";
import { entitlementsContract } from "@/hooks/api/entitlements-schema";
import {
  billingPlansContract,
  billingProfileContract,
  seatInfoContract,
  subscriptionResponseContract,
} from "@/hooks/api/subscription-schema";

function prefetchSubscription(queryClient: QueryClient, gate: PrefetchGate) {
  if (!gate.can("billing:subscription:view")) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: growthAndSignQueryKeys.billing.subscription(),
    queryFn: () => serverGet("/billing", subscriptionResponseContract),
    staleTime: 5 * 60_000,
  });
}

export async function prefetchBillingSettings(tab: BillingTab) {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  const reads: Array<Promise<unknown>> = [];

  if (tab === "plan" || tab === "payments")
    reads.push(prefetchSubscription(queryClient, gate));

  if (tab === "plan") {
    reads.push(
      queryClient.prefetchQuery({
        queryKey: growthAndSignQueryKeys.billing.plans(),
        queryFn: () => serverGet("/billing/plans", billingPlansContract),
        staleTime: 60 * 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: growthAndSignQueryKeys.billing.entitlements(),
        queryFn: () => serverGet("/billing/entitlements", entitlementsContract),
        staleTime: 900_000,
      }),
    );
    if (gate.can("billing:seats:view"))
      reads.push(
        queryClient.prefetchQuery({
          queryKey: growthAndSignQueryKeys.billing.seats(),
          queryFn: () => serverGet("/billing/seats", seatInfoContract),
          staleTime: 2 * 60 * 1000,
        }),
      );
  }

  if (tab === "profile" && gate.can("billing:profile:view"))
    reads.push(
      queryClient.prefetchQuery({
        queryKey: growthAndSignQueryKeys.billing.profile(),
        queryFn: () => serverGet("/billing/profile", billingProfileContract),
        staleTime: 5 * 60 * 1000,
      }),
    );

  await Promise.all(reads);
  return dehydrate(queryClient);
}

export async function prefetchAiCreditsSettings() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("billing:ai-credits:view"))
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: growthAndSignQueryKeys.billing.aiCredits(),
        queryFn: () => serverGet("/billing/ai-credits", aiCreditsWalletContract),
        staleTime: 300_000,
      }),
      queryClient.prefetchQuery({
        queryKey: growthAndSignQueryKeys.billing.aiCreditTransactions(
          AI_CREDIT_TRANSACTION_PARAMS,
        ),
        queryFn: () =>
          serverGet(
            `/billing/ai-credits/transactions?limit=${AI_CREDIT_TRANSACTION_PARAMS.limit}`,
            aiCreditTransactionsPageContract,
          ),
        staleTime: 30 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: growthAndSignQueryKeys.billing.aiCreditsUsage(AI_CREDITS_USAGE_DAYS),
        queryFn: () =>
          serverGet(
            `/billing/ai-credits/usage?days=${AI_CREDITS_USAGE_DAYS}`,
            aiCreditsUsageContract,
          ),
        staleTime: 60_000,
      }),
    ]);
  return dehydrate(queryClient);
}
