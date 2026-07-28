"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Calendar, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSubscription,
  useCreateSubscriptionOrder,
  useVerifySubscription,
  useValidateCoupon,
  useBillingPlans,
  type SubscriptionPlan,
  type BillingCycle,
  type CouponValidationResult,
  type PlanDefinition,
} from "@/hooks/api/subscription";
import { PlanCard } from "@/features/billing/components/plan-card";
import { CouponSection } from "@/features/billing/components/coupon-section";
import { SeatsBlock } from "@/features/billing/components/seats-block";
import { PlanUsageMeters } from "@/features/billing/components/plan-usage-meters";
import { PRICING } from "@/lib/pricing";

function planConfigFromDefinition(
  plan: PlanDefinition,
): { monthlyPrice: number; label: string; features: string[] } {
  return {
    monthlyPrice: plan.monthlyPrice,
    label: plan.name,
    features: plan.features,
  };
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  TRIAL: { label: "Trial", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  PAST_DUE: { label: "Past Due", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
  EXPIRED: { label: "Expired", variant: "outline" },
};

function PlanTabSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-9 w-52 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="min-h-[240px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function PlanTab() {
  const { data: session } = useSession();
  const { data, isLoading, isError, refetch } = useSubscription();
  const {
    data: plansResponse,
    isLoading: plansLoading,
    isError: plansError,
    refetch: refetchPlans,
  } = useBillingPlans();
  const { mutateAsync: createOrder, isPending: isCreatingOrder } =
    useCreateSubscriptionOrder();
  const { mutateAsync: verifySubscription, isPending: isVerifying } =
    useVerifySubscription();

  const planCatalog = plansResponse?.plans ?? [];
  const planConfigById = Object.fromEntries(
    planCatalog.map((p) => [p.id, planConfigFromDefinition(p)]),
  ) as Partial<
    Record<SubscriptionPlan, { monthlyPrice: number; label: string; features: string[] }>
  >;

  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [selectedPlanForCoupon, setSelectedPlanForCoupon] =
    useState<SubscriptionPlan | null>(null);

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
    void refetchPlans();
  }

  const planLabel = useCallback((plan: SubscriptionPlan): string => {
    return planConfigById[plan]?.label ?? plan;
  }, [planConfigById]);

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
          couponId:
            appliedCoupon?.valid ? (appliedCoupon.couponId ?? undefined) : undefined,
        });
        const rzp = new window.Razorpay({
          key: order.keyId ?? "",
          order_id: order.orderId,
          amount: order.amount,
          currency: "INR",
          name: "StreamlineOS",
          description: `${planLabel(plan)} Plan – ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
          prefill: { email: session?.user?.email ?? undefined },
          handler: async (response: RazorpayPaymentResponse) => {
            try {
              await verifySubscription({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              });
              toast.success(
                `Upgraded to ${planLabel(plan)} plan successfully!`,
              );
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          },
          modal: {
            ondismiss: () => setUpgradingPlan(null),
          },
        });
        rzp.open();
      } catch (err) {
        toast.error(getErrorMessage(err));
        setUpgradingPlan(null);
      }
    },
    [data?.isConfigured, createOrder, verifySubscription, session, billingCycle, appliedCoupon, planLabel],
  );

  const [now] = useState(Date.now);
  const currentPlan = data?.subscription?.plan ?? null;
  const currentStatus = data?.subscription?.status ?? null;
  const statusInfo = currentStatus ? STATUS_BADGE[currentStatus] : null;
  const isBusy = isCreatingOrder || isVerifying;
  const trialEndsAt = data?.subscription?.trialEndsAt;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(trialEndsAt).getTime() - now) / 86_400_000),
      )
    : null;

  if (isLoading || plansLoading) {
    return <PlanTabSkeleton />;
  }

  if (isError || plansError) {
    return (
      <ErrorState
        title="Couldn't load subscription"
        description="Something went wrong while fetching your subscription details."
        onRetry={handleRetry}
        className="flex-1"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {currentPlan
              ? `Current plan: ${planLabel(currentPlan)}`
              : "No active plan"}
          </p>
          {currentStatus === "TRIAL" && trialEndsAt && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Trial ends{" "}
              {new Date(trialEndsAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {trialDaysRemaining !== null && trialDaysRemaining <= 7 && (
                <span className="font-semibold">
                  &nbsp;(
                  {trialDaysRemaining === 0
                    ? "today"
                    : `${trialDaysRemaining}d left`}
                  )
                </span>
              )}
            </p>
          )}
          {currentStatus === "ACTIVE" && data?.subscription?.currentPeriodEnd && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Renews{" "}
              {new Date(
                data.subscription.currentPeriodEnd,
              ).toLocaleDateString("en-IN", {
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Payment gateway is not configured. Contact your administrator to enable
          online payments.
        </div>
      )}

      <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
        <button
          onClick={handleSetMonthly}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            billingCycle === "monthly"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={handleSetAnnual}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            billingCycle === "annual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            Save {PRICING.annualDiscountPct}%
          </span>
        </button>
      </div>

      {planCatalog.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Plan catalog is unavailable. Refresh the page or contact support to upgrade.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {planCatalog.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan.id}
              config={planConfigFromDefinition(plan)}
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
      )}

      <CouponSection
        couponInput={couponInput}
        appliedCoupon={appliedCoupon}
        couponResult={couponResult}
        isValidatingCoupon={isValidatingCoupon}
        helperText={!selectedPlanForCoupon ? "Select a plan to apply this code." : undefined}
        onInputChange={handleCouponInputChange}
        onApply={handleApplyCoupon}
        onRemove={handleRemoveCoupon}
      />

      <SeatsBlock />

      <PlanUsageMeters />
    </div>
  );
}
