"use client";

import { Check, Zap } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan, BillingCycle } from "@/hooks/api/subscription";
import { PRICING } from "@/lib/pricing";

interface PlanConfig {
  monthlyPrice: number;
  label: string;
  features: string[];
}

const PLAN_TONE: Record<SubscriptionPlan, { bg: string; text: string }> = {
  STARTER: { bg: "bg-primary/10", text: "text-primary" },
  PROFESSIONAL: { bg: "bg-primary/10", text: "text-primary" },
  ENTERPRISE: { bg: "bg-primary/10", text: "text-primary" },
};

interface PlanCardProps {
  plan: SubscriptionPlan;
  config: PlanConfig;
  billingCycle: BillingCycle;
  currentPlan: SubscriptionPlan | null;
  currentStatus: string | null;
  upgradingPlan: SubscriptionPlan | null;
  isBusy: boolean;
  isConfigured: boolean | undefined;
  onUpgrade: (plan: SubscriptionPlan) => void;
}

function getAnnualMonthlyPrice(monthlyPrice: number) {
  return Math.round(monthlyPrice * (1 - PRICING.annualDiscountPct / 100));
}

export function PlanCard({
  plan,
  config,
  billingCycle,
  currentPlan,
  currentStatus,
  upgradingPlan,
  isBusy,
  isConfigured,
  onUpgrade,
}: PlanCardProps) {
  const isCurrentPlan = currentPlan === plan && currentStatus === "ACTIVE";
  const isEnterprise = plan === "ENTERPRISE";
  const tone = PLAN_TONE[plan];
  const isUpgrading = upgradingPlan === plan && isBusy;
  const displayPrice =
    billingCycle === "annual"
      ? getAnnualMonthlyPrice(config.monthlyPrice)
      : config.monthlyPrice;
  const annualTotal = Math.round(config.monthlyPrice * 12 * 0.8);

  function handleUpgrade() {
    onUpgrade(plan);
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border bg-card p-5 transition-shadow",
        isCurrentPlan
          ? "border-primary ring-1 ring-primary/20"
          : isEnterprise
            ? "border-primary/30 hover:shadow-sm"
            : "border-border hover:shadow-sm",
      )}
    >
      {isCurrentPlan && (
        <span className="absolute -top-px left-4 inline-flex items-center rounded-b-md bg-primary px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-primary-foreground">
          Current
        </span>
      )}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone.bg)}>
            <Zap className={cn("h-4 w-4", tone.text)} aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
        </div>
        <p className="text-2xl font-bold text-foreground">
          ₹{displayPrice.toLocaleString("en-IN")}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
        {billingCycle === "annual" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            ₹{annualTotal.toLocaleString("en-IN")} billed annually
          </p>
        )}
      </div>
      <ul className="flex-1 space-y-2 mb-5">
        {config.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <LoadingButton
        size="sm"
        variant={isCurrentPlan ? "secondary" : "default"}
        disabled={isCurrentPlan || !isConfigured || (isBusy && upgradingPlan !== plan)}
        isPending={isUpgrading}
        loadingText="Processing…"
        onClick={handleUpgrade}
        className="w-full"
      >
        {isCurrentPlan ? "Current Plan" : "Upgrade"}
      </LoadingButton>
    </div>
  );
}
