/**
 * Public / marketing pricing.
 *
 * Chargeable amounts, seat limits, and trial length MUST match backend
 * `plan-entitlements.constants.ts`. The billing UI loads live plans from
 * GET /billing/plans; this file is only for landing pages that cannot call auth APIs.
 *
 * Keep in sync via `lib/__tests__/pricing-consistency.test.ts`.
 */

export const PRICING = {
  currency: "₹",
  /** Free plan seat limit — mirrors PLAN_LIMITS.members.FREE */
  freeSeatLimit: 5,
  /** Alias used by older marketing copy */
  starterSeatLimit: 5,
  /** STARTER monthly price in INR — mirrors PLAN_PRICES_PAISE.STARTER / 100 */
  starterMonthlyInr: 999,
  /** PROFESSIONAL monthly price in INR */
  professionalMonthlyInr: 2499,
  /** ENTERPRISE monthly price in INR (from) */
  enterpriseMonthlyInr: 4999,
  /** Annual discount fraction — mirrors ANNUAL_DISCOUNT_PCT */
  annualDiscountPct: 20,
  /** Trial length in days — mirrors DEFAULT_TRIAL_DAYS */
  trialDays: 14,
  freeStorageGb: 5,
  starterStorageGb: 100,
  professionalStorageGb: 1024,
} as const;

export type BillingPeriod = "monthly" | "annual";

export type PricingTier = {
  id: "free" | "starter" | "professional" | "enterprise";
  /** Backend plan id when chargeable */
  planId: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  name: string;
  tagline: string;
  description: string;
  monthly: number | null;
  annual: number | null;
  priceLabel: { monthly: string; annual: string };
  price: string;
  period: string;
  bestFor: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight: boolean;
  badge?: string;
};

const fmt = (n: number) => `${PRICING.currency}${n.toLocaleString("en-IN")}`;

const annualOf = (monthly: number) =>
  Math.round(monthly * (1 - PRICING.annualDiscountPct / 100));

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    planId: "FREE",
    name: "Free",
    tagline: "Forever free",
    description: "Try StreamlineOS with a small team. No card required.",
    monthly: 0,
    annual: 0,
    priceLabel: {
      monthly: `${PRICING.currency}0`,
      annual: `${PRICING.currency}0`,
    },
    price: `${PRICING.currency}0`,
    period: `up to ${PRICING.freeSeatLimit} seats`,
    bestFor: "Solo founders, evaluating",
    features: [
      `Up to ${PRICING.freeSeatLimit} seats`,
      "All core modules — HR, Projects, CRM, Chat",
      `${PRICING.freeStorageGb} GB workspace storage`,
      "Single organization",
      "Community support",
    ],
    cta: "Get started",
    ctaHref: "/signin",
    highlight: false,
  },
  {
    id: "starter",
    planId: "STARTER",
    name: "Starter",
    tagline: "Built for growing teams",
    description:
      "Core HR, payroll, and leave for early-stage teams with clear seat limits.",
    monthly: PRICING.starterMonthlyInr,
    annual: annualOf(PRICING.starterMonthlyInr),
    priceLabel: {
      monthly: fmt(PRICING.starterMonthlyInr),
      annual: fmt(annualOf(PRICING.starterMonthlyInr)),
    },
    price: fmt(PRICING.starterMonthlyInr),
    period: "per org / month",
    bestFor: "Small teams getting operational",
    features: [
      `Up to 10 seats`,
      "Everything in Free",
      "Payroll management",
      "Leave & attendance",
      `${PRICING.starterStorageGb} GB workspace storage`,
      "Email support",
    ],
    cta: "Get started",
    ctaHref: "/signin",
    highlight: true,
    badge: "Most popular",
  },
  {
    id: "professional",
    planId: "PROFESSIONAL",
    name: "Professional",
    tagline: "For scaling teams",
    description:
      "AI assistance, CRM, recruitment, and the controls scaling teams need.",
    monthly: PRICING.professionalMonthlyInr,
    annual: annualOf(PRICING.professionalMonthlyInr),
    priceLabel: {
      monthly: fmt(PRICING.professionalMonthlyInr),
      annual: fmt(annualOf(PRICING.professionalMonthlyInr)),
    },
    price: fmt(PRICING.professionalMonthlyInr),
    period: "per org / month",
    bestFor: "Growing companies",
    features: [
      "Up to 50 seats",
      "Everything in Starter",
      "AI lead scoring & smart drafts",
      "Recruitment & performance",
      "CRM & sales tools",
      "Priority support",
    ],
    cta: "Get started",
    ctaHref: "/signin",
    highlight: false,
  },
  {
    id: "enterprise",
    planId: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Compliance-grade",
    description: "Negotiated seats, custom SLA, and dedicated support.",
    monthly: PRICING.enterpriseMonthlyInr,
    annual: null,
    priceLabel: {
      monthly: `from ${fmt(PRICING.enterpriseMonthlyInr)}`,
      annual: "Custom",
    },
    price: `from ${fmt(PRICING.enterpriseMonthlyInr)}`,
    period: "per org / month",
    bestFor: "Large / regulated teams",
    features: [
      "Everything in Professional",
      "Negotiated seat limits",
      "Custom SLA",
      "Audit logs & compliance pack",
      "Dedicated CSM",
      "Custom data residency",
    ],
    cta: "Talk to sales",
    ctaHref: "/contact?topic=sales",
    highlight: false,
  },
];

/**
 * `PRICING_TIERS.find(…)!` appeared three times, and the `!` is the only reason
 * a renamed or removed tier id compiled: `find` returns `undefined`, every
 * `STARTER_TIER.annual` read below becomes a crash at the call site, and nothing
 * names the tier that went missing. Resolving it once, loudly, keeps the failure
 * at the file that owns the list.
 */
function requireTier(id: PricingTier["id"]): PricingTier {
  const tier = PRICING_TIERS.find((candidate) => candidate.id === id);
  if (!tier) throw new Error(`pricing: PRICING_TIERS has no "${id}" tier`);
  return tier;
}

const STARTER_TIER = requireTier("starter");

export const COMPETITOR_PRICES = {
  allInOneErp: 580,
  zohoOne: 2500,
  keka: 120,
  hubspotStarter: 1700,
  teamChat: 365,
  notion: 830,
  asana: 915,
  pipedrive: 1160,
} as const;

type SavingsBreakdown = {
  competitorAnnual: number;
  streamlineAnnual: number;
  savings: number;
  savingsPct: number;
};

/** Round to a whole percent. Never print 100% while a rupee is still due. */
function savingsPercent(savings: number, baseline: number): number {
  if (baseline <= 0) return 0;
  const pct = Math.round((savings / baseline) * 100);
  if (pct >= 100 && savings < baseline) return 99;
  return pct;
}

export function calculateSavingsVsAllInOne(
  seats: number,
  billingPeriod: BillingPeriod = "annual",
): SavingsBreakdown {
  const competitorAnnual = COMPETITOR_PRICES.allInOneErp * seats * 12;
  const streamlinePerSeat =
    billingPeriod === "annual"
      ? (STARTER_TIER.annual ?? 0)
      : (STARTER_TIER.monthly ?? 0);
  // Org-priced plans: compare total org cost vs competitor per-seat stack for the seat count.
  const streamlineAnnual = streamlinePerSeat * 12;
  return {
    competitorAnnual,
    streamlineAnnual,
    savings: competitorAnnual - streamlineAnnual,
    savingsPct: savingsPercent(competitorAnnual - streamlineAnnual, competitorAnnual),
  };
}

export function calculateSavingsVsStack(seats: number) {
  const stackPerSeat =
    COMPETITOR_PRICES.keka +
    COMPETITOR_PRICES.hubspotStarter +
    COMPETITOR_PRICES.teamChat +
    COMPETITOR_PRICES.notion;
  const stackAnnual = stackPerSeat * seats * 12;
  const streamlineAnnual = (STARTER_TIER.annual ?? 0) * 12;
  return {
    stackAnnual,
    stackPerSeat,
    streamlineAnnual,
    savings: stackAnnual - streamlineAnnual,
    savingsPct: savingsPercent(stackAnnual - streamlineAnnual, stackAnnual),
  };
}

export function bundleSavingsCopy(): string {
  return `Typical all-in-one platforms charge ${fmt(COMPETITOR_PRICES.allInOneErp)}/seat or more for the same bundle. StreamlineOS Starter is ${fmt(STARTER_TIER.annual ?? annualOf(PRICING.starterMonthlyInr))}/month on annual billing.`;
}

export function cheapestAnnualLabel(): string {
  const cheapest = PRICING_TIERS.find((t) => t.annual && t.annual > 0);
  if (!cheapest || !cheapest.annual) return fmt(annualOf(PRICING.starterMonthlyInr));
  return fmt(cheapest.annual);
}
