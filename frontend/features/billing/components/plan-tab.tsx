"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Calendar, CreditCard, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSubscription,
  useCreateSubscriptionOrder,
  useVerifySubscription,
  useAwaitCheckoutReconciliation,
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
import { PlanTabSkeleton } from "@/features/billing/components/billing-page-skeleton";
import { EntitlementGate } from "@/components/entitlement-gate";
import {
  loadCheckoutScript,
  openCheckout,
  useCheckoutScript,
} from "@/features/billing/lib/checkout-script";
import type { BillingReadiness } from "@/hooks/api/subscription";

function assertNever(x: never): never {
  throw new Error(`Unhandled readiness reason: ${String(x)}`);
}

function readinessUnavailableMessage(reason: NonNullable<BillingReadiness["unavailableReason"]>): string {
  switch (reason) {
    case "no_credentials":
      return "Online payments are not enabled yet — contact StreamlineOS support to activate.";
    case "incomplete_credentials":
      return "Payment configuration is incomplete — contact StreamlineOS support.";
    case "unsupported_provider":
      return "Online payments are temporarily unavailable — contact StreamlineOS support.";
    default:
      return assertNever(reason);
  }
}

function resolveAnnualSavingsPct(plans: PlanDefinition[]): number | null {
  const discounted = plans.find(
    (plan) => plan.monthlyPrice > 0 && plan.annualPrice > 0 && plan.annualPrice < plan.monthlyPrice,
  );
  if (!discounted) return null;
  return Math.round((1 - discounted.annualPrice / discounted.monthlyPrice) * 100);
}

function planConfigFromDefinition(
  plan: PlanDefinition,
): { monthlyPrice: number; annualPrice: number; annualTotalPaise: number; label: string; features: string[] } {
  return {
    monthlyPrice: plan.monthlyPrice,
    annualPrice: plan.annualPrice,
    annualTotalPaise: plan.annualTotalPaise,
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

export function PlanTab() {
  const { data: session } = useSession();
  const { data, isLoading, isError, error, refetch } = useSubscription();
  const {
    data: plansResponse,
    isLoading: plansLoading,
    isError: plansError,
    error: plansErrorObj,
    refetch: refetchPlans,
  } = useBillingPlans();
  const { mutateAsync: createOrder, isPending: isCreatingOrder } =
    useCreateSubscriptionOrder();
  const { mutateAsync: verifySubscription, isPending: isVerifying } =
    useVerifySubscription();
  const awaitReconciliation = useAwaitCheckoutReconciliation();
  const { state: scriptState, retry: retryScript } = useCheckoutScript();
  const [isReconciling, setIsReconciling] = useState(false);
  const checkoutInFlightRef = useRef(false);

  const planCatalog = plansResponse?.plans ?? [];
  const annualSavingsPct = resolveAnnualSavingsPct(planCatalog);
  const planConfigById = Object.fromEntries(
    planCatalog.map((p) => [p.id, planConfigFromDefinition(p)]),
  ) as Partial<
    Record<SubscriptionPlan, { monthlyPrice: number; annualPrice: number; annualTotalPaise: number; label: string; features: string[] }>
  >;

  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionPlan | null>(null);
  const [upgradeError, setUpgradeError] = useState<unknown>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const { data: couponResult, isFetching: isValidatingCoupon } = useValidateCoupon(
    couponInput,
    selectedPlan,
    billingCycle,
  );

  useEffect(() => {
    void loadCheckoutScript();
  }, []);

  const planLabel = useCallback(
    (plan: SubscriptionPlan): string => planConfigById[plan]?.label ?? plan,
    [planConfigById],
  );

  const reconcileInBackground = useCallback(
    async (plan: SubscriptionPlan, options?: { attempts?: number; quiet?: boolean }) => {
      if (options?.quiet !== true) setIsReconciling(true);
      try {
        const settled = await awaitReconciliation(plan, { attempts: options?.attempts });
        if (settled)
          toast.success(`Upgraded to ${planLabel(plan)} plan successfully!`);
      } finally {
        if (options?.quiet !== true) setIsReconciling(false);
      }
    },
    [awaitReconciliation, planLabel],
  );

  function handleRetry() {
    void refetch();
    void refetchPlans();
  }

  function handleRetryUpgrade() {
    setUpgradeError(null);
  }

  function handleRetryScript() {
    retryScript();
  }

  function handleSetMonthly() {
    setBillingCycle("monthly");
    setAppliedCoupon(null);
  }

  function handleSetAnnual() {
    setBillingCycle("annual");
    setAppliedCoupon(null);
  }

  function handleSelectPlan(plan: SubscriptionPlan) {
    if (plan !== selectedPlan) {
      setAppliedCoupon(null);
      setCouponInput("");
    }
    setSelectedPlan(plan);
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
    setSelectedPlan(null);
  }

  function handleCouponInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCouponInput(e.target.value.toUpperCase());
    setAppliedCoupon(null);
  }

  const handleUpgrade = useCallback(
    async (plan: SubscriptionPlan) => {
      if (scriptState !== "ready") {
        toast.error("Payment checkout is not available. Please retry or refresh the page.");
        return;
      }
      if (data?.platformCheckout?.configured !== true && data?.isConfigured !== true) {
        toast.error("Payment gateway not configured. Contact support.");
        return;
      }
      if (checkoutInFlightRef.current) return;
      checkoutInFlightRef.current = true;

      const handleCheckoutDismissed = () => {
        checkoutInFlightRef.current = false;
        setUpgradingPlan(null);
        void reconcileInBackground(plan, { attempts: 1, quiet: true });
      };

      setSelectedPlan(plan);
      setUpgradingPlan(plan);
      setUpgradeError(null);
      const couponId =
        plan === selectedPlan && appliedCoupon?.valid
          ? (appliedCoupon.couponId ?? undefined)
          : undefined;
      try {
        const order = await createOrder({
          plan,
          billingCycle,
          couponId,
        });
        openCheckout({
          key: order.keyId ?? "",
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: "StreamlineOS",
          description: `${planLabel(plan)} Plan – ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
          prefillEmail: session?.user?.email ?? undefined,
          onSuccess: async (response) => {
            try {
              const result = await verifySubscription({
                orderId: response.orderId,
                paymentId: response.paymentId,
                signature: response.signature,
              });
              checkoutInFlightRef.current = false;
              setUpgradingPlan(null);
              toast.success(
                `Upgraded to ${planLabel(result.plan)} plan successfully!`,
              );
            } catch (err) {
              checkoutInFlightRef.current = false;
              setUpgradingPlan(null);
              toast.error(getErrorMessage(err));
              await reconcileInBackground(plan);
            }
          },
          onDismiss: handleCheckoutDismissed,
        });
      } catch (err) {
        checkoutInFlightRef.current = false;
        setUpgradeError(err);
        toast.error(getErrorMessage(err));
        setUpgradingPlan(null);
      }
    },
    [scriptState, data?.platformCheckout, data?.isConfigured, createOrder, verifySubscription, reconcileInBackground, session, billingCycle, appliedCoupon, selectedPlan, planLabel],
  );

  const [now] = useState(Date.now);
  const currentPlan = data?.subscription?.plan ?? null;
  const currentStatus = data?.subscription?.status ?? null;
  const statusInfo = currentStatus ? STATUS_BADGE[currentStatus] : null;
  const isBusy = isCreatingOrder || isVerifying || isReconciling;
  const trialEndsAt = data?.subscription?.trialEndsAt;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(trialEndsAt).getTime() - now) / 86_400_000),
      )
    : null;

  const isDataLoading = isLoading || plansLoading;

  const paymentsReady =
    (data?.platformCheckout?.configured ?? data?.isConfigured) === true &&
    scriptState === "ready";

  function getReadinessMessage(): string | null {
    if (isDataLoading) return null;
    if (isError) return null;
    if (data?.platformCheckout !== undefined) {
      if (data.platformCheckout.configured) return null;
      const reason = data.platformCheckout.unavailableReason;
      if (reason === null) return null;
      return readinessUnavailableMessage(reason);
    }
    if (data?.isConfigured === false) {
      return "Payment gateway is not configured. Contact StreamlineOS support to enable online payments.";
    }
    return null;
  }

  const readinessMessage = getReadinessMessage();

  if (isDataLoading) {
    return <PlanTabSkeleton />;
  }

  if (isError || plansError) {
    return (
      <ErrorState
        title="Couldn't load subscription"
        description={getErrorMessage(isError ? error : plansErrorObj)}
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
            <p className="text-xs text-status-warning-ink mt-0.5 flex items-center gap-1">
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

      {readinessMessage && (
        <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3 text-sm text-status-warning-ink">
          {readinessMessage}
        </div>
      )}

      {scriptState === "failed" && (
        <div className="flex items-center gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3 text-sm text-status-warning-ink">
          <span className="flex-1">
            Payment checkout failed to load. Check your connection and try again.
          </span>
          <LoadingButton
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRetryScript}
            className="shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Retry
          </LoadingButton>
        </div>
      )}

      <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
        <button
          type="button"
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
          type="button"
          onClick={handleSetAnnual}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            billingCycle === "annual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          {annualSavingsPct !== null && (
            <span className="inline-flex items-center rounded-full bg-status-success-surface px-1.5 py-0.5 text-micro font-semibold text-status-success-ink">
              Save {annualSavingsPct}%
            </span>
          )}
        </button>
      </div>

      <EntitlementGate error={upgradeError} onRetry={handleRetryUpgrade} compact>
        {planCatalog.length === 0 ? (
          <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3 text-sm text-status-warning-ink">
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
                isConfigured={paymentsReady}
                selectedPlan={selectedPlan}
                onUpgrade={handleUpgrade}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}
      </EntitlementGate>

      <CouponSection
        couponInput={couponInput}
        appliedCoupon={appliedCoupon}
        couponResult={couponResult}
        isValidatingCoupon={isValidatingCoupon}
        canApply={selectedPlan !== null}
        helperText={!selectedPlan ? "Select a plan card above to apply this code." : undefined}
        onInputChange={handleCouponInputChange}
        onApply={handleApplyCoupon}
        onRemove={handleRemoveCoupon}
      />

      <SeatsBlock />

      <PlanUsageMeters />
    </div>
  );
}
