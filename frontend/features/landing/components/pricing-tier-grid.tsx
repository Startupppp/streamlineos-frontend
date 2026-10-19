"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { BrandCta } from "@/features/landing/relay/components/ui/brand-cta";
import { GlassTierButton } from "@/features/landing/relay/home/sections/pricing/glass-tier-button";
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

type PricingTierGridProps = {
  showAppsGrid?: boolean;
  defaultPeriod?: BillingPeriod;
  /**
   * The tiers to show, defaulting to the compiled-in table.
   *
   * Ticket 12: the pricing page now reads live amounts from `/public/pricing`
   * so it quotes the number that will actually be charged, in the visitor's
   * currency. Every other caller of this grid renders the static table, which
   * is why this is a default rather than a required prop -- and why the static
   * table stays: a marketing page that renders nothing because an API is down
   * is worse than one quoting a fortnight-old price.
   */
  tiers?: readonly PricingTier[];
};

export function PricingTierGrid({
  showAppsGrid = true,
  defaultPeriod = "annual",
  tiers = PRICING_TIERS,
}: PricingTierGridProps) {
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod);

  return (
    <>
      <PricingBillingToggle period={period} onChange={setPeriod} className="mb-10 w390:mb-8" />
      {/* Four across at 1440 (the homepage's 20 gap), 2 × 2 at 1024 and 768,
          stacked at 390 — the homepage pricing cards' rhythm. */}
      <div className="grid grid-cols-4 gap-5 w1024:grid-cols-2 w1024:gap-3 w390:grid-cols-1">
        {tiers.map((tier, i) => (
          <PricingCard key={tier.id} tier={tier} period={period} index={i} />
        ))}
      </div>
      {showAppsGrid ? (
        <IncludedAppsGrid compact title="Every app. One price." subtitle="" />
      ) : null}
    </>
  );
}

/**
 * Relay plan card (features/landing/relay/home/sections/pricing/tier-card.tsx):
 * glass card on the hairline border, mono plan name, the brand-gradient tag,
 * and — on the featured plan — the accent stroke and glow plus the brand CTA.
 * Every feature line comes from `lib/pricing.ts`.
 */
function PricingCard({
  tier,
  period,
  index,
}: {
  tier: PricingTier;
  period: BillingPeriod;
  index: number;
}) {
  const displayPrice =
    period === "annual" ? tier.priceLabel.annual : tier.priceLabel.monthly;
  const comparePrice =
    period === "annual" && tier.monthly && tier.annual && tier.monthly > tier.annual
      ? fmt(tier.monthly)
      : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: EASE_OUT }}
      className={`relative flex min-w-0 flex-col rounded-pricing-card border border-pricing-card-border bg-pricing-card p-7.75 backdrop-blur-card w1024:p-5.75 w390:p-4.75 ${
        tier.highlight ? "shadow-pricing-featured" : ""
      }`}
    >
      {tier.highlight ? (
        <span
          aria-hidden="true"
          className="stroke-ring pointer-events-none absolute -inset-px rounded-pricing-card [background:var(--pricing-featured-stroke)]"
        />
      ) : null}

      {/* One row height on every card, so the tag never pushes the featured
          plan's lines out of step with the others. */}
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 className="min-w-0 font-mono text-relay-label leading-label text-foreground-muted">
          {tier.name}
        </h3>
        {tier.badge ? (
          <p className="shrink-0 rounded-pricing-tag bg-linear-135 from-brand-from to-brand-to px-3 py-1.5 font-mono text-relay-label leading-label whitespace-nowrap text-on-accent">
            {tier.badge}
          </p>
        ) : null}
      </div>
      <p className="text-relay-label leading-label text-foreground-dim">{tier.tagline}</p>

      <div className="mt-6 flex flex-col items-start gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {comparePrice ? (
            <span className="text-body leading-body text-foreground-dim line-through tabular-nums">
              {comparePrice}
            </span>
          ) : null}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={displayPrice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="text-pricing-price leading-pricing-price font-semibold tracking-title text-foreground tabular-nums"
            >
              {displayPrice}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="font-mono text-relay-label leading-label text-foreground-dim">{tier.period}</p>
        {/* Always laid out (hidden when it does not apply) so every card's
            feature list starts on the same line. */}
        <p
          className={`mt-1 font-mono text-relay-label leading-label text-accent-soft ${
            period === "annual" && tier.monthly && tier.annual ? "" : "invisible"
          }`}
        >
          Save {PRICING.annualDiscountPct}% vs monthly
        </p>
      </div>

      <span aria-hidden="true" className="my-6 block h-px bg-pricing-hairline" />

      <ul className="flex flex-1 flex-col gap-3">
        {tier.features.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-body leading-body text-foreground-muted">
            <Check
              className={`mt-1 size-4 shrink-0 ${tier.highlight ? "text-accent-soft" : "text-pricing-check"}`}
              strokeWidth={2.5}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {tier.highlight ? (
          <BrandCta
            href={tier.ctaHref}
            label={tier.cta}
            className="h-12 w-full text-body leading-body"
          />
        ) : (
          <GlassTierButton href={tier.ctaHref} className="w-full w1024:h-12">
            {tier.cta}
          </GlassTierButton>
        )}
      </div>
    </motion.article>
  );
}
