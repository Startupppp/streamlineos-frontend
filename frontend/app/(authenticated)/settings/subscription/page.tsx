"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Calendar, CreditCard } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import {
  useSubscription,
  useCreateSubscriptionOrder,
  useVerifySubscription,
  useValidateCoupon,
  type SubscriptionPlan,
  type BillingCycle,
  type CouponValidationResult,
} from "@/hooks/api/subscription";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PlanCard } from "@/features/subscription/components/plan-card";
import { CouponSection } from "@/features/subscription/components/coupon-section";
import { RecentPaymentsTable } from "@/features/subscription/components/recent-payments-table";

const PLAN_CONFIG: Record<
  SubscriptionPlan,
  { monthlyPrice: number; label: string; features: string[] }
> = {
  STARTER: {
    monthlyPrice: 999,
    label: "Starter",
    features: [
      "Up to 10 employees",
      "Core HR & Attendance",
      "Payroll management",
      "Leave management",
      "Email support",
    ],
  },
  PROFESSIONAL: {
    monthlyPrice: 2499,
    label: "Professional",
    features: [
      "Up to 50 employees",
      "Everything in Starter",
      "Recruitment module",
      "Performance & OKRs",
      "CRM & Sales tools",
      "Priority support",
    ],
  },
  ENTERPRISE: {
    monthlyPrice: 4999,
    label: "Enterprise",
    features: [
      "Unlimited employees",
      "Everything in Professional",
      "Advanced analytics",
      "Custom integrations",
      "Dedicated account manager",
      "SLA-backed support",
    ],
  },
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIAL: { label: "Trial", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  PAST_DUE: { label: "Past Due", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
  EXPIRED: { label: "Expired", variant: "outline" },
};

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const { data, isLoading, isError, refetch } = useSubscription();
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateSubscriptionOrder();
  const { mutateAsync: verifySubscription, isPending: isVerifying } = useVerifySubscription();
  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [selectedPlanForCoupon, setSelectedPlanForCoupon] = useState<SubscriptionPlan | null>(null);

  const { data: couponResult, isFetching: isValidatingCoupon } = useValidateCoupon(
    couponInput,
    selectedPlanForCoupon,
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  function handleRetry() {
    void refetch();
  }

  function handleSetMonthly() {
    setBillingCycle("monthly");
  }

  function handleSetAnnual() {
    setBillingCycle("annual");
  }

  function handleApplyCoupon() {
    if (!couponResult?.valid) {
      toast.error(couponResult?.message ?? "Invalid coupon");
      return;
    }
    setAppliedCoupon(couponResult);
    toast.success(couponResult.message);
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setSelectedPlanForCoupon(null);
  }

  function handleCouponInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCouponInput(e.target.value.toUpperCase());
    setAppliedCoupon(null);
    if (selectedPlanForCoupon) setSelectedPlanForCoupon(selectedPlanForCoupon);
  }

  const handleUpgrade = useCallback(
    async (plan: SubscriptionPlan) => {
      if (!data?.isConfigured) {
        toast.error("Payment gateway not configured. Contact support.");
        return;
      }
      setSelectedPlanForCoupon(plan);
      setUpgradingPlan(plan);
      try {
        const order = await createOrder({
          plan,
          billingCycle,
          couponId: appliedCoupon?.valid ? (appliedCoupon.couponId ?? undefined) : undefined,
        });
        const rzp = new window.Razorpay({
          key: order.keyId ?? "",
          order_id: order.orderId,
          amount: order.amount,
          currency: "INR",
          name: "StreamlineOS",
          description: `${PLAN_CONFIG[plan].label} Plan – ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
          prefill: { email: session?.user?.email ?? undefined },
          handler: async (response: RazorpayPaymentResponse) => {
            try {
              await verifySubscription({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              });
              toast.success(`Upgraded to ${PLAN_CONFIG[plan].label} plan successfully!`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Payment verification failed");
            }
          },
          modal: {
            ondismiss: () => setUpgradingPlan(null),
          },
        });
        rzp.open();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to initiate payment");
        setUpgradingPlan(null);
      }
    },
    [data?.isConfigured, createOrder, verifySubscription, session, billingCycle, appliedCoupon],
  );

  const now = Date.now();
  const currentPlan = data?.subscription?.plan ?? null;
  const currentStatus = data?.subscription?.status ?? null;
  const statusInfo = currentStatus ? STATUS_BADGE[currentStatus] : null;
  const isBusy = isCreatingOrder || isVerifying;

  const trialEndsAt = data?.subscription?.trialEndsAt;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / 86_400_000))
    : null;

  if (isLoading) {
    return (
      <PageWrapper title="Subscription" subtitle="Manage your plan and billing.">
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-10 w-56 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Subscription" subtitle="Manage your plan and billing.">
        <ErrorState
          title="Couldn't load subscription"
          description="Something went wrong while fetching your subscription details."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Subscription" subtitle="Manage your plan and billing.">
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {currentPlan
                ? `Current plan: ${PLAN_CONFIG[currentPlan].label}`
                : "No active plan"}
            </p>
            {currentStatus === "TRIAL" && trialEndsAt && (
              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Trial ends{" "}
                {new Date(trialEndsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {trialDaysRemaining !== null && trialDaysRemaining <= 7 && (
                  <span className="font-semibold">
                    &nbsp;({trialDaysRemaining === 0 ? "today" : `${trialDaysRemaining}d left`})
                  </span>
                )}
              </p>
            )}
            {currentStatus === "ACTIVE" && data?.subscription?.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Renews{" "}
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          {statusInfo && (
            <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
              {statusInfo.label}
            </Badge>
          )}
        </div>

        {!data?.isConfigured && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Payment gateway is not configured. Contact your administrator to enable online payments.
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
            <button
              onClick={handleSetMonthly}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={handleSetAnnual}
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                billingCycle === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(PLAN_CONFIG) as SubscriptionPlan[]).map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              config={PLAN_CONFIG[plan]}
              billingCycle={billingCycle}
              currentPlan={currentPlan}
              currentStatus={currentStatus}
              upgradingPlan={upgradingPlan}
              isBusy={isBusy}
              isConfigured={data?.isConfigured}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>

        <CouponSection
          couponInput={couponInput}
          appliedCoupon={appliedCoupon}
          couponResult={couponResult}
          isValidatingCoupon={isValidatingCoupon}
          onInputChange={handleCouponInputChange}
          onApply={handleApplyCoupon}
          onRemove={handleRemoveCoupon}
        />

        {data?.subscription?.payments && (
          <RecentPaymentsTable payments={data.subscription.payments} />
        )}
      </div>
    </PageWrapper>
  );
}
