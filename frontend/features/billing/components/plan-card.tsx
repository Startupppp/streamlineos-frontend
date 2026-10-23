"use client";

import { Check, Zap } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan, BillingCycle } from "@/hooks/api/subscription";

interface PlanConfig {
  monthlyPrice: number;
  annualTotalPaise: number;
  annualPrice: number;
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
  currentMonthlyPrice: number | null;
  upgradingPlan: SubscriptionPlan | null;
  isBusy: boolean;
  isConfigured: boolean | undefined;
  selectedPlan: SubscriptionPlan | null;
  onUpgrade: (plan: SubscriptionPlan) => void;
  onSelect: (plan: SubscriptionPlan) => void;
}

export function PlanCard({
  plan,
  config,
  billingCycle,
  currentPlan,
  currentStatus,
  currentMonthlyPrice,
  upgradingPlan,
  isBusy,
  isConfigured,
  selectedPlan,
  onUpgrade,
  onSelect,
}: PlanCardProps) {
  const canManageSubscription = useCan("billing:subscription:manage");
  const isTrialPlan = currentPlan === plan && currentStatus === "TRIAL";
  const isCurrentPlan = currentPlan === plan && (currentStatus === "ACTIVE" || isTrialPlan);
  const isLocked = isCurrentPlan && !isTrialPlan;
  const isEnterprise = plan === "ENTERPRISE";
  const tone = PLAN_TONE[plan];
  const isUpgrading = upgradingPlan === plan && isBusy;
  const isSelected = selectedPlan === plan;
  const isDowngrade =
    !isLocked &&
    !isTrialPlan &&
    currentStatus === "ACTIVE" &&
    currentMonthlyPrice !== null &&
    config.monthlyPrice < currentMonthlyPrice;
  const annualTotal = Math.round(config.annualTotalPaise / 100);

  function handleCardClick() {
    if (!isLocked) onSelect(plan);
  }

  function handleCardKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (isLocked) return;
    e.preventDefault();
    onSelect(plan);
  }

  function handleUpgrade(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onUpgrade(plan);
  }

  return (
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-label={`Select ${config.label} plan`}
      aria-pressed={isSelected}
      className={cn(
        "relative flex flex-col rounded-lg border bg-card p-5 transition-shadow",
        isCurrentPlan
          ? "border-primary ring-1 ring-primary/20 cursor-default"
          : isSelected
            ? "border-primary/60 ring-1 ring-primary/10 hover:shadow-sm cursor-pointer"
            : isEnterprise
              ? "border-primary/30 hover:shadow-sm cursor-pointer"
              : "border-border hover:shadow-sm cursor-pointer",
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      {isCurrentPlan && (
        <span className="absolute -top-px left-4 inline-flex items-center rounded-b-md bg-primary px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-primary-foreground">
          {isTrialPlan ? "Current · Trial" : "Current"}
        </span>
      )}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone.bg)}>
            <Zap className={cn("h-4 w-4", tone.text)} aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums">
          ₹{(billingCycle === "annual" ? annualTotal : config.monthlyPrice).toLocaleString("en-IN")}
          <span className="text-sm font-normal text-muted-foreground">
            {billingCycle === "annual" ? "/yr" : "/mo"}
          </span>
        </p>
        {billingCycle === "annual" && (
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            ≈₹{config.annualPrice.toLocaleString("en-IN")}/mo
          </p>
        )}
      </div>
      <ul className="flex-1 space-y-2 mb-5">
        {config.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-status-success-ink mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      {canManageSubscription ? (
        <LoadingButton
          type="button"
          size="sm"
          variant={isLocked ? "secondary" : "default"}
          disabled={isLocked || !isConfigured || isBusy}
          isPending={isUpgrading}
          loadingText="Processing…"
          onClick={handleUpgrade}
          className="w-full"
        >
          {isLocked ? "Current Plan" : isTrialPlan ? "Subscribe" : isDowngrade ? "Downgrade" : "Upgrade"}
        </LoadingButton>
      ) : (
        <p className="text-xs text-muted-foreground">
          {isCurrentPlan
            ? "Your organization's current plan."
            : "Only a billing administrator can change the plan."}
        </p>
      )}
    </div>
  );
}
