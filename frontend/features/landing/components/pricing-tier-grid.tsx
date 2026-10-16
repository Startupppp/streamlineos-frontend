"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING, type BillingPeriod, type PricingTier } from "@/lib/pricing";
import { PricingBillingToggle } from "./pricing-billing-toggle";
import { EASE_OUT } from "./motion/variants";
import { REVEAL, VIEWPORT_EARLY } from "../home/motion";

const fmt = (n: number) => `${PRICING.currency}${n.toLocaleString("en-IN")}`;

const TIER_SUMMARY: Record<PricingTier["id"], string[]> = {
  free: ["All core apps", `Up to ${PRICING.freeSeatLimit} people`, "StreamlineOS Cloud", "Community support"],
  starter: ["All apps", "Up to 10 people", "Payroll & leave", "Email support"],
  professional: ["All apps", "Up to 50 people", "CRM, hiring and AI", "Priority support"],
  enterprise: ["All apps", "Any team size", "Custom support terms", "A dedicated contact"],
};

/** `/pricing` passes live amounts from `/public/pricing`; the home page passes the static table. */
export function PricingTierGrid({ tiers }: { tiers: readonly PricingTier[] }) {
  const [period, setPeriod] = useState<BillingPeriod>("annual");

  return (
    <>
      <PricingBillingToggle period={period} onChange={setPeriod} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier, i) => (
          <PricingCard key={tier.id} tier={tier} period={period} index={i} />
        ))}
      </div>
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
  const displayPrice = tier.priceLabel[period];
  const comparePrice =
    period === "annual" && tier.monthly && tier.annual && tier.monthly > tier.annual
      ? fmt(tier.monthly)
      : null;

  const dark = tier.highlight;

  // Shell-and-sheet card: the plan's name sits on a tinted shell, the price and
  // what you get sit on a white sheet inside it. The recommended plan's shell
  // goes dark. Prices are set in the sans, never the display serif: figures
  // have to read at a glance.
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_EARLY}
      transition={{ ...REVEAL, delay: index * 0.05 }}
      className={`flex min-w-0 flex-col rounded-3xl p-1.5 transition-transform duration-300 ease-out hover:-translate-y-1 ${
        dark ? "bg-foreground shadow-xl" : "border border-border bg-muted"
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-4 pt-4">
        <div className="min-w-0">
          <h3 className={`text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-foreground"}`}>
            {tier.name}
          </h3>
          <p className={`mt-0.5 text-sm ${dark ? "text-white/65" : "text-muted-foreground"}`}>{tier.tagline}</p>
        </div>
        {tier.badge ? (
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white">
            {tier.badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col rounded-[1.125rem] bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {comparePrice ? (
            <span className="text-lg font-medium tabular-nums text-muted-foreground line-through">
              {comparePrice}
            </span>
          ) : null}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={displayPrice}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground sm:text-5xl"
            >
              {displayPrice}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {period === "annual" && tier.annual === null ? "Annual terms agreed with our team" : tier.period}
        </p>
        <p className="mt-1 min-h-5 text-xs font-medium text-status-success-ink">
          {period === "annual" && tier.monthly && tier.annual
            ? `Save ${PRICING.annualDiscountPct}% vs monthly`
            : null}
        </p>

        <Button
          asChild
          variant={dark ? "default" : "outline"}
          className="mt-6 h-11 w-full rounded-full font-semibold"
        >
          <Link href={tier.ctaHref}>
            {tier.cta}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>

        <ul className="mt-6 flex-1 space-y-3 border-t border-border pt-6">
          {TIER_SUMMARY[tier.id].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-status-success-ink" strokeWidth={2.5} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
