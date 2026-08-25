"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PRICING,
  PRICING_TIERS,
  type BillingPeriod,
  type PricingTier,
} from "@/lib/pricing";
import { PricingBillingToggle } from "./pricing-billing-toggle";
import { IncludedAppsGrid } from "./included-apps-grid";
import { EASE_OUT } from "./motion/variants";

const fmt = (n: number) => `${PRICING.currency}${n.toLocaleString("en-IN")}`;

const TIER_SUMMARY: Record<PricingTier["id"], string[]> = {
  free: [
    "All core apps",
    `Up to ${PRICING.freeSeatLimit} seats`,
    "StreamlineOS Cloud",
    "Community support",
  ],
  starter: [
    "All apps",
    "Up to 10 seats",
    "Payroll & leave",
    "Email support",
  ],
  professional: [
    "All apps",
    "AI assistance",
    "CRM & recruitment",
    "Priority support",
  ],
  enterprise: [
    "All apps",
    "Negotiated seats",
    "Custom SLA & compliance",
    "Dedicated CSM",
  ],
};

type PricingTierGridProps = {
  showAppsGrid?: boolean;
  defaultPeriod?: BillingPeriod;
};

export function PricingTierGrid({
  showAppsGrid = true,
  defaultPeriod = "annual",
}: PricingTierGridProps) {
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod);

  return (
    <>
      <PricingBillingToggle period={period} onChange={setPeriod} className="mb-8" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PRICING_TIERS.map((tier, i) => (
          <PricingCard key={tier.id} tier={tier} period={period} index={i} />
        ))}
      </div>
      {showAppsGrid ? (
        <IncludedAppsGrid compact title="Every app. One price." subtitle="" />
      ) : null}
    </>
  );
}

function PricingCard({
  tier,
  period,
  index,
}: {
  tier: PricingTier;
  period: BillingPeriod;
  index: number;
}) {
  const isFree = tier.monthly === 0;
  const displayPrice =
    period === "annual" ? tier.priceLabel.annual : tier.priceLabel.monthly;
  const comparePrice =
    period === "annual" && tier.monthly && tier.annual && tier.monthly > tier.annual
      ? fmt(tier.monthly)
      : null;
  const bullets = TIER_SUMMARY[tier.id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: EASE_OUT }}
      className={`relative flex flex-col rounded-2xl border bg-white transition-shadow hover:shadow-md min-w-0 ${
        tier.highlight
          ? "border-status-info-rule shadow-sm ring-1 ring-status-info-rule"
          : "border-border shadow-sm"
      }`}
    >
      {tier.badge ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-status-info-fill px-3 py-0.5 text-dense font-semibold text-white tracking-wide whitespace-nowrap">
          {tier.badge}
        </div>
      ) : null}

      <div className="border-b border-border px-4 sm:px-5 pt-6 pb-5">
        <h3 className="font-display text-lg font-bold text-foreground">{tier.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{tier.tagline}</p>

        <div className="mt-5 flex items-baseline gap-2 flex-wrap">
          {comparePrice ? (
            <span className="text-base font-medium text-muted-foreground line-through tabular-nums">
              {comparePrice}
            </span>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.span
              key={displayPrice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums leading-none"
            >
              {displayPrice}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm text-muted-foreground">
            {isFree ? tier.period : "/ user / mo"}
          </span>
        </div>

        {period === "annual" && !isFree && tier.monthly && tier.annual ? (
          <p className="mt-2 text-xs font-medium text-status-success-ink">
            Save {PRICING.annualDiscountPct}% vs monthly
          </p>
        ) : null}
      </div>

      <ul className="flex-1 space-y-2.5 px-4 sm:px-5 py-5">
        {bullets.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm text-muted-foreground leading-snug"
          >
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-status-success-ink"
              strokeWidth={2.5}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>

      <div className="space-y-2 px-4 sm:px-5 pb-5">
        <Link href={tier.ctaHref} className="block">
          <Button
            variant={tier.highlight ? "default" : "outline"}
            className="h-10 w-full font-semibold"
          >
            {tier.cta}
            <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
