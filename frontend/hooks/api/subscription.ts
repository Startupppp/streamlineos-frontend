"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type SubscriptionPlan = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

interface SubscriptionPayment {
  id: number;
  orgId: string;
  subscriptionId: number;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface Subscription {
  id: number;
  orgId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  razorpaySubscriptionId: string | null;
  razorpayCustomerId: string | null;
  razorpayPlanId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  payments: SubscriptionPayment[];
}

interface SubscriptionResponse {
  subscription: Subscription | null;
  publicKeyId: string | null;
  isConfigured: boolean;
}

export type BillingCycle = "monthly" | "annual";

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
    queryFn: ({ signal }) => apiClient.get<SubscriptionResponse>("/billing", undefined, signal),
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

export interface CouponValidationResult {
  valid: boolean;
  couponId: number | null;
  type: "PERCENTAGE" | "FIXED" | null;
  value: number | null;
  discountAmount: number | null;
  message: string;
}

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  /** Monthly price in paise when returned by the catalog API. */
  monthlyPricePaise?: number;
  features: string[];
  maxEmployees: number | null;
}

export interface BillingPlansResponse {
  plans: PlanDefinition[];
  trialPlan?: SubscriptionPlan;
}

export function useBillingPlans() {
  return useQuery<BillingPlansResponse, Error>({
    queryKey: queryKeys.billing.plans(),
    queryFn: ({ signal }) => apiClient.get<BillingPlansResponse>("/billing/plans", undefined, signal),
    staleTime: 60 * 60_000,
  });
}

export function useValidateCoupon(code: string, plan: SubscriptionPlan | null) {
  const canManage = useCan("billing:subscription:manage");
  return useQuery<CouponValidationResult, Error>({
    queryKey: queryKeys.billing.coupon(code, plan),
    queryFn: ({ signal }) =>
      apiClient.get<CouponValidationResult>(
        `/billing/coupons/validate?code=${encodeURIComponent(code)}&plan=${plan ?? ""}`, undefined, signal,
      ),
    enabled: canManage && code.trim().length >= 3 && plan !== null,
    staleTime: 30_000,
    retry: false,
  });
}

export interface BillingProfile {
  id: number;
  orgId: string;
  gstin: string | null;
  pan: string | null;
  billingName: string | null;
  billingEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  isTaxExempt: boolean;
}

export interface SeatInfo {
  /** Honours negotiated ENTERPRISE seats, not just the base plan limit. */
  total: number | null;
  /** activeMembers + pendingInvitations — matches what blocks a new invite. */
  used: number;
  available: number | null;
  activeMembers: number;
  pendingInvitations: number;
}

export function useBillingProfile() {
  const canViewProfile = useCan("billing:profile:view");
  return useQuery<BillingProfile>({
    queryKey: queryKeys.billing.profile(),
    queryFn: ({ signal }) => apiClient.get<BillingProfile>("/billing/profile", undefined, signal),
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
    queryFn: ({ signal }) => apiClient.get<SeatInfo>("/billing/seats", undefined, signal),
    staleTime: 2 * 60 * 1000,
    enabled: canViewSeats,
  });
}
