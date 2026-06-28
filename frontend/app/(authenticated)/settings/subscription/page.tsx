"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, CreditCard, Loader2, Zap } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useSubscription,
  useCreateSubscriptionOrder,
  useVerifySubscription,
  type SubscriptionPlan,
} from "@/lib/api/hooks/subscription";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { email?: string };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

const PLAN_CONFIG: Record<
  SubscriptionPlan,
  { price: number; label: string; features: string[] }
> = {
  STARTER: {
    price: 999,
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
    price: 2499,
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
    price: 4999,
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

function PlanCard({
  plan,
  config,
  currentPlan,
  currentStatus,
  upgradingPlan,
  isBusy,
  isConfigured,
  onUpgrade,
}: {
  plan: SubscriptionPlan;
  config: { price: number; label: string; features: string[] };
  currentPlan: SubscriptionPlan | null;
  currentStatus: string | null;
  upgradingPlan: SubscriptionPlan | null;
  isBusy: boolean;
  isConfigured: boolean | undefined;
  onUpgrade: (plan: SubscriptionPlan) => void;
}) {
  const isCurrentPlan = currentPlan === plan && currentStatus === "ACTIVE";
  const isUpgrading = upgradingPlan === plan && isBusy;

  function handleUpgrade() {
    onUpgrade(plan);
  }

  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card p-5 transition-shadow ${
        isCurrentPlan
          ? "border-primary ring-1 ring-primary/20"
          : "border-border hover:shadow-sm"
      }`}
    >
      {isCurrentPlan && (
        <span className="absolute -top-px left-4 inline-flex items-center rounded-b-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          Current
        </span>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
        </div>
        <p className="text-2xl font-bold text-foreground">
          ₹{config.price.toLocaleString("en-IN")}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
      </div>

      <ul className="flex-1 space-y-2 mb-5">
        {config.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        variant={isCurrentPlan ? "secondary" : "default"}
        disabled={isCurrentPlan || !isConfigured || (isBusy && upgradingPlan !== plan)}
        onClick={handleUpgrade}
        className="w-full"
      >
        {isUpgrading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            Processing…
          </>
        ) : isCurrentPlan ? (
          "Current Plan"
        ) : (
          "Upgrade"
        )}
      </Button>
    </div>
  );
}

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const { data, isLoading, isError, refetch } = useSubscription();
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateSubscriptionOrder();
  const { mutateAsync: verifySubscription, isPending: isVerifying } = useVerifySubscription();
  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionPlan | null>(null);

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

  const handleUpgrade = useCallback(
    async (plan: SubscriptionPlan) => {
      if (!data?.isConfigured) {
        toast.error("Payment gateway not configured. Contact support.");
        return;
      }
      setUpgradingPlan(plan);
      try {
        const order = await createOrder({ plan });
        const rzp = new window.Razorpay({
          key: order.keyId ?? "",
          order_id: order.orderId,
          amount: order.amount,
          currency: "INR",
          name: "StreamlineOS",
          description: `${PLAN_CONFIG[plan].label} Plan Subscription`,
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
    [data?.isConfigured, createOrder, verifySubscription, session],
  );

  const currentPlan = data?.subscription?.plan ?? null;
  const currentStatus = data?.subscription?.status ?? null;
  const statusInfo = currentStatus ? STATUS_BADGE[currentStatus] : null;
  const isBusy = isCreatingOrder || isVerifying;

  if (isLoading) {
    return (
      <PageWrapper title="Subscription" subtitle="Manage your plan and billing.">
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
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
            {data?.subscription?.currentPeriodEnd && (
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(PLAN_CONFIG) as SubscriptionPlan[]).map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              config={PLAN_CONFIG[plan]}
              currentPlan={currentPlan}
              currentStatus={currentStatus}
              upgradingPlan={upgradingPlan}
              isBusy={isBusy}
              isConfigured={data?.isConfigured}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>

        {data?.subscription?.payments && data.subscription.payments.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Recent Payments</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Payment ID</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscription.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                        {payment.razorpayPaymentId ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        ₹{Number(payment.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {payment.paidAt
                          ? new Date(payment.paidAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
