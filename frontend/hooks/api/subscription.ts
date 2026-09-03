"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import type {
  BillingPlansResponse,
  BillingProfile,
  CouponValidationResult,
  SeatInfo,
  SubscriptionPlan,
  SubscriptionResponse,
} from "@/hooks/api/subscription-schema";

export type {
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionPayment,
  Subscription,
  SubscriptionResponse,
  PlanDefinition,
  BillingPlansResponse,
  BillingProfile,
  SeatInfo,
  CouponValidationResult,
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

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
}

interface VerifySubscriptionInput {
  orderId: string;
  paymentId: string;
  signature: string;
  plan: SubscriptionPlan;
}

interface VerifySubscriptionResponse {
  success: boolean;
  plan: SubscriptionPlan;
  status: "ACTIVE";
}

export function useSubscription() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canViewSubscription = useCan("billing:subscription:view");
  return useQuery<SubscriptionResponse, Error>({
    queryKey: queryKeys.billing.subscription(),
    queryFn: ({ signal }) => apiClient.get("/billing", undefined, signal, subscriptionContractSource),
    staleTime: 5 * 60_000,
    enabled: !!orgId && canViewSubscription,
  });
}

export function useCreateSubscriptionOrder() {
  return useAuthorizedMutation<CreateOrderResponse, Error, { plan: SubscriptionPlan; billingCycle?: BillingCycle; couponId?: number }>("billing:subscription:manage", {
    mutationKey: ["billing", "checkout", "create-order"],
    mutationFn: (data) => apiClient.post<CreateOrderResponse>("/billing/checkout", data),
  });
}

export function useVerifySubscription() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<VerifySubscriptionResponse, Error, VerifySubscriptionInput>("billing:subscription:manage", {
    mutationKey: ["billing", "checkout", "confirm"],
    mutationFn: (data) => apiClient.patch<VerifySubscriptionResponse>("/billing/checkout", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.entitlements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.seats() });
    },
  });
}

export function useBillingPlans() {
  return useQuery<BillingPlansResponse, Error>({
    queryKey: queryKeys.billing.plans(),
    queryFn: ({ signal }) => apiClient.get("/billing/plans", undefined, signal, plansContract),
    staleTime: 60 * 60_000,
  });
}

export function useValidateCoupon(code: string, plan: SubscriptionPlan | null) {
  const canManage = useCan("billing:subscription:manage");
  return useQuery<CouponValidationResult, Error>({
    queryKey: queryKeys.billing.coupon(code, plan),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/billing/coupons/validate?code=${encodeURIComponent(code)}&plan=${plan ?? ""}`,
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
    queryKey: queryKeys.billing.profile(),
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
      apiClient.patch<BillingProfile>("/billing/profile", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.billing.profile() });
    },
  });
}

export function useSeatInfo() {
  const canViewSeats = useCan("billing:seats:view");
  return useQuery<SeatInfo>({
    queryKey: queryKeys.billing.seats(),
    queryFn: ({ signal }) => apiClient.get("/billing/seats", undefined, signal, seatsContract),
    staleTime: 2 * 60 * 1000,
    enabled: canViewSeats,
  });
}
