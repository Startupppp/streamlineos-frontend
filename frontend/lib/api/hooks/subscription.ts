"use client";

import { useQuery, useMutation, useQueryClient, useQueryClient as useQC } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type SubscriptionPlan = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface SubscriptionPayment {
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

export interface Subscription {
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
  razorpayKeyId: string | null;
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
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: SubscriptionPlan;
}

interface VerifySubscriptionResponse {
  success: boolean;
  plan: SubscriptionPlan;
  status: "ACTIVE";
}

const SUBSCRIPTION_QUERY_KEY = ["subscription"] as const;

export function useSubscription() {
  return useQuery<SubscriptionResponse, Error>({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => apiClient.get<SubscriptionResponse>("/billing/razorpay"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateSubscriptionOrder() {
  return useMutation<CreateOrderResponse, Error, { plan: SubscriptionPlan; billingCycle?: BillingCycle }>({
    mutationFn: (data) => apiClient.post<CreateOrderResponse>("/billing/razorpay", data),
  });
}

export function useVerifySubscription() {
  const queryClient = useQueryClient();
  return useMutation<VerifySubscriptionResponse, Error, VerifySubscriptionInput>({
    mutationFn: (data) => apiClient.patch<VerifySubscriptionResponse>("/billing/razorpay", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: BILLING_SUMMARY_QUERY_KEY });
    },
  });
}

export interface BillingSummary {
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    trialEndsAt: string | null;
    trialDaysRemaining: number | null;
    currentPeriodEnd: string | null;
    isActive: boolean;
    isTrial: boolean;
  } | null;
  invoiceStats: {
    totalPaid: string;
    totalOutstanding: string;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  isConfigured: boolean;
}

const BILLING_SUMMARY_QUERY_KEY = ["billing", "summary"] as const;

export function useBillingSummary() {
  return useQuery<BillingSummary, Error>({
    queryKey: BILLING_SUMMARY_QUERY_KEY,
    queryFn: () => apiClient.get<BillingSummary>("/billing/summary"),
    staleTime: 5 * 60_000,
  });
}
