"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

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
const BILLING_SUMMARY_QUERY_KEY = ["billing", "summary"] as const;

export function useSubscription() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery<SubscriptionResponse, Error>({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => apiClient.get<SubscriptionResponse>("/billing/razorpay"),
    staleTime: 5 * 60_000,
    enabled: !!orgId,
  });
}

export function useCreateSubscriptionOrder() {
  return useMutation<CreateOrderResponse, Error, { plan: SubscriptionPlan; billingCycle?: BillingCycle; couponId?: number }>({
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
  features: string[];
  maxEmployees: number | null;
}

export interface BillingSummary {
  subscription: {
    plan: SubscriptionPlan;
    status: string;
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

export function useBillingPlans() {
  return useQuery<{ plans: PlanDefinition[] }, Error>({
    queryKey: ["billing", "plans"],
    queryFn: () => apiClient.get<{ plans: PlanDefinition[] }>("/billing/plans"),
    staleTime: 60 * 60_000,
  });
}

export function useBillingSummary() {
  return useQuery<BillingSummary, Error>({
    queryKey: BILLING_SUMMARY_QUERY_KEY,
    queryFn: () => apiClient.get<BillingSummary>("/billing/summary"),
    staleTime: 5 * 60_000,
  });
}

export function useValidateCoupon(code: string, plan: SubscriptionPlan | null) {
  return useQuery<CouponValidationResult, Error>({
    queryKey: ["billing", "coupon", code, plan],
    queryFn: () =>
      apiClient.get<CouponValidationResult>(
        `/billing/coupons/validate?code=${encodeURIComponent(code)}&plan=${plan ?? ""}`,
      ),
    enabled: code.trim().length >= 3 && plan !== null,
    staleTime: 30_000,
    retry: false,
  });
}

export interface BillingProfile {
  id: number;
  orgId: number;
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
  total: number;
  used: number;
  available: number;
}

export function useBillingProfile() {
  return useQuery<BillingProfile>({
    queryKey: ["billing", "profile"],
    queryFn: () => apiClient.get<BillingProfile>("/billing/profile"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateBillingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BillingProfile>) =>
      apiClient.patch<BillingProfile>("/billing/profile", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "profile"] });
      toast.success("Billing profile updated");
    },
    onError: (e: Error) =>
      toast.error(e.message ?? "Failed to update profile"),
  });
}

export function useSeatInfo() {
  return useQuery<SeatInfo>({
    queryKey: ["billing", "seats"],
    queryFn: () => apiClient.get<SeatInfo>("/billing/seats"),
    staleTime: 2 * 60 * 1000,
  });
}
