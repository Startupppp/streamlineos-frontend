"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import type {
  BillingPlansResponse,
  BillingProfile,
  CouponValidationResult,
  CreateOrderResult,
  SeatInfo,
  SubscriptionPlan,
  SubscriptionResponse,
  VerifySubscriptionRequest,
  VerifySubscriptionResult,
} from "@/hooks/api/subscription-schema";

export type {
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionPayment,
  Subscription,
  SubscriptionResponse,
  BillingReadiness,
  PlanDefinition,
  BillingPlansResponse,
  BillingProfile,
  SeatInfo,
  CouponValidationResult,
  CreateOrderResult,
  VerifySubscriptionRequest,
  VerifySubscriptionResult,
} from "@/hooks/api/subscription-schema";

export type BillingCycle = "monthly" | "annual";

/**
 * Deferred: `components/billing/trial-banner.tsx` renders inside the dashboard
 * shell, so a value import of these five put the whole billing schema — and
 * Zod — in front of every authenticated route. Every one is still passed in the
 * contract slot, so all five reads parse as before.
 */
const subscriptionContractSource = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then(
    (m) => m.subscriptionResponseContract,
  ),
);
const plansContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then((m) => m.billingPlansContract),
);
const couponContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then(
    (m) => m.couponValidationContract,
  ),
);
const profileContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then(
    (m) => m.billingProfileContract,
  ),
);
const seatsContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then((m) => m.seatInfoContract),
);
const createOrderContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then((m) => m.createOrderContract),
);
const verifySubscriptionContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then((m) => m.verifySubscriptionContract),
);
const updateBillingProfileContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then((m) => m.billingProfileContract),
);
const verifySubscriptionRequestContract = lazyContract(() =>
  import("@/hooks/api/subscription-schema").then((m) => m.verifySubscriptionRequestContract),
);

export function useSubscription() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canViewSubscription = useCan("billing:subscription:view");
  return useQuery<SubscriptionResponse, Error>({
    queryKey: growthAndSignQueryKeys.billing.subscription(),
    queryFn: ({ signal }) => apiClient.get("/billing", undefined, signal, subscriptionContractSource),
    staleTime: 5 * 60_000,
    enabled: !!orgId && canViewSubscription,
  });
}

export function useCreateSubscriptionOrder() {
  return useAuthorizedMutation<CreateOrderResult, Error, { plan: SubscriptionPlan; billingCycle?: BillingCycle; couponId?: number }>("billing:subscription:manage", {
    mutationKey: ["billing", "checkout", "create-order"],
    mutationFn: (data) => apiClient.post("/billing/checkout", data, undefined, createOrderContract),
  });
}

/**
 * Everything a settled purchase changes. The browser callback and the bounded
 * reconciliation poll below share this one list so a surface can never be refreshed
 * by one path and left stale by the other.
 */
export function invalidateSettledPurchase(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.subscription() });
  queryClient.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.summary() });
  queryClient.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.entitlements() });
  queryClient.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.seats() });
  queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
  queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.orgModules() });
}

export function useVerifySubscription() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<VerifySubscriptionResult, Error, VerifySubscriptionRequest>("billing:subscription:manage", {
    mutationKey: ["billing", "checkout", "confirm"],
    mutationFn: (data) => apiClient.patch("/billing/checkout", data, undefined, verifySubscriptionContract),
    onSuccess: () => {
      invalidateSettledPurchase(queryClient);
    },
  });
}

export const CHECKOUT_RECONCILIATION_ATTEMPTS = 6;
export const CHECKOUT_RECONCILIATION_INTERVAL_MS = 5_000;

/**
 * The browser callback is not the only way a purchase settles: the customer can close
 * the tab, or the confirmation can fail after the provider already captured, leaving the
 * provider webhook as the only entrance. This polls the subscription a bounded number of
 * times so those cases still converge, and stops the moment the term is visible. It is
 * deliberately bounded — an unbounded poll on a tab nobody is watching is a load source,
 * and a purchase that has not settled in this window is a support case, not a slow read.
 */
export function useAwaitCheckoutReconciliation() {
  const queryClient = useQueryClient();

  return useCallback(
    async (
      expectedPlan: SubscriptionPlan,
      options?: { attempts?: number; intervalMs?: number; signal?: AbortSignal },
    ): Promise<boolean> => {
      const attempts = options?.attempts ?? CHECKOUT_RECONCILIATION_ATTEMPTS;
      const intervalMs = options?.intervalMs ?? CHECKOUT_RECONCILIATION_INTERVAL_MS;

      for (let attempt = 0; attempt < attempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        if (options?.signal?.aborted === true) return false;

        await queryClient.refetchQueries({
          queryKey: growthAndSignQueryKeys.billing.subscription(),
          type: "all",
        });
        const settled = queryClient.getQueryData<SubscriptionResponse>(
          growthAndSignQueryKeys.billing.subscription(),
        );
        if (settled?.subscription?.plan === expectedPlan) {
          invalidateSettledPurchase(queryClient);
          return true;
        }
      }
      return false;
    },
    [queryClient],
  );
}

export function useBillingPlans() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery<BillingPlansResponse, Error>({
    queryKey: growthAndSignQueryKeys.billing.plans(),
    queryFn: ({ signal }) => apiClient.get("/billing/plans", undefined, signal, plansContract),
    staleTime: 60 * 60_000,
    enabled: !!orgId,
  });
}

export function useValidateCoupon(code: string, plan: SubscriptionPlan | null, billingCycle?: BillingCycle) {
  const canManage = useCan("billing:subscription:manage");
  const cycleParam = billingCycle ? `&billingCycle=${billingCycle}` : "";
  return useQuery<CouponValidationResult, Error>({
    queryKey: growthAndSignQueryKeys.billing.coupon(code, plan, billingCycle),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/billing/coupons/validate?code=${encodeURIComponent(code)}&plan=${plan ?? ""}${cycleParam}`,
        undefined,
        signal,
        couponContract,
      ),
    enabled: canManage && code.trim().length >= 3 && plan !== null,
    staleTime: 30_000,
    retry: false,
  });
}

export function useBillingProfile() {
  const canViewProfile = useCan("billing:profile:view");
  return useQuery<BillingProfile>({
    queryKey: growthAndSignQueryKeys.billing.profile(),
    queryFn: ({ signal }) => apiClient.get("/billing/profile", undefined, signal, profileContract),
    staleTime: 5 * 60 * 1000,
    enabled: canViewProfile,
  });
}

export function useUpdateBillingProfile() {
  const qc = useQueryClient();
  return useAuthorizedMutation("billing:profile:update", {
    mutationKey: ["billing", "profile", "update"],
    mutationFn: (data: Partial<BillingProfile>) =>
      apiClient.patch("/billing/profile", data, undefined, updateBillingProfileContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.profile() });
    },
  });
}

export function useSeatInfo() {
  const canViewSeats = useCan("billing:seats:view");
  return useQuery<SeatInfo>({
    queryKey: growthAndSignQueryKeys.billing.seats(),
    queryFn: ({ signal }) => apiClient.get("/billing/seats", undefined, signal, seatsContract),
    staleTime: 2 * 60 * 1000,
    enabled: canViewSeats,
  });
}
