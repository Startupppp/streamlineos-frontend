import { PRICING, PRICING_TIERS } from "@/lib/pricing";

/**
 * The trial length in words, from `PRICING.trialDays` — the backend's
 * DEFAULT_TRIAL_DAYS. Whole months read better than "182-day"; anything
 * under two months stays in days.
 */
const trialMonths = Math.round(PRICING.trialDays / 30.44);
export const TRIAL_LABEL =
  PRICING.trialDays >= 60 ? `${trialMonths}-month` : `${PRICING.trialDays}-day`;

/** Where every "start" CTA goes: sign-up and sign-in are one flow (/signup redirects here). */
export const SIGN_IN_HREF = "/signin";

/** The plan cards are drawn for four feature lines. */
const CARD_FEATURES = 4;

/**
 * 09 Pricing — Figma 3488:22781 layout. Plans, prices, seats and the trial
 * come from `lib/pricing.ts` (mirrors the backend's plan entitlements);
 * nothing here restates a number. `seats` drives the people slider.
 */
export const pricingMock = {
  head: {
    badge: "pricing",
    title: { before: "Start free. Pay as the ", accent: "team", after: " grows." },
    aside: `Monthly prices in INR. Annual billing saves ${PRICING.annualDiscountPct}%, and every paid plan starts with a ${TRIAL_LABEL} free trial.`,
  },
  meter: {
    eyebrow: "estimate",
    question: "How many people will use it?",
    resultEyebrow: "your plan",
    unit: "people",
    cta: { label: "Start free", href: SIGN_IN_HREF },
  },
  tiers: PRICING_TIERS.map((tier) => ({
    name: tier.name,
    price: tier.priceLabel.monthly,
    seats: tier.seatLimit,
    seatsLabel:
      tier.id === "enterprise"
        ? `${tier.seatLimit} people, or negotiated`
        : `up to ${tier.seatLimit} people`,
    period: tier.monthly === 0 ? "free forever" : tier.period,
    featured: tier.highlight,
    tag: tier.badge,
    features: tier.features
      .slice(0, CARD_FEATURES)
      .map((label) => ({ label, size: "label" as const })),
    cta: { label: tier.cta, href: tier.ctaHref },
  })),
};

export type PricingContent = typeof pricingMock;
