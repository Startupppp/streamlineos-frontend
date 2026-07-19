export const PRICING = {
  currency: "₹",
  freeSeatLimit: 5,
  starterSeatLimit: 5,
  scaleupPriceInr: 499,
  annualDiscountPct: 20,
} as const;

export type BillingPeriod = "monthly" | "annual";

export type PricingTier = {
  id: "starter" | "startup" | "growth" | "enterprise";
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

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
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
    period: `up to ${PRICING.starterSeatLimit} seats`,
    bestFor: "Solo founders, evaluating",
    features: [
      `Up to ${PRICING.starterSeatLimit} seats`,
      "All core modules — HR, Projects, CRM, Chat",
      "5 GB workspace storage",
      "Single organization",
      "Community support",
    ],
    cta: "Start free",
    ctaHref: "/signin",
    highlight: false,
  },
  {
    id: "startup",
    name: "Startup",
    tagline: "Built for growing teams",
    description:
      "Unlimited seats with everything an early-stage team needs to operate.",
    monthly: 499,
    annual: 399,
    priceLabel: { monthly: fmt(499), annual: fmt(399) },
    price: fmt(499),
    period: "per seat / month",
    bestFor: "5–25 person startups",
    features: [
      "Unlimited seats",
      "Everything in Free",
      "Workflow automation",
      "Public API access",
      "Custom roles & permissions",
      "100 GB workspace storage",
      "Email support (24hr response)",
    ],
    cta: "Start 14-day trial",
    ctaHref: "/signin",
    highlight: true,
    badge: "Most popular",
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For scaling teams",
    description:
      "AI assistance, multi-org, SSO, and the controls scaling teams need.",
    monthly: 799,
    annual: 639,
    priceLabel: { monthly: fmt(799), annual: fmt(639) },
    price: fmt(799),
    period: "per seat / month",
    bestFor: "25–100 employees",
    features: [
      "Everything in Startup",
      "AI lead scoring & smart drafts",
      "Multi-branch, multi-org",
      "SAML / SSO + SCIM",
      "Advanced analytics & scheduled reports",
      "1 TB workspace storage",
      "Priority support (4hr response)",
    ],
    cta: "Start 14-day trial",
    ctaHref: "/signin",
    highlight: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Compliance-grade",
    description: "Dedicated infrastructure, custom SLA, and on-prem option.",
    monthly: 1499,
    annual: null,
    priceLabel: { monthly: `from ${fmt(1499)}`, annual: "Custom" },
    price: `from ${fmt(1499)}`,
    period: "per seat / month",
    bestFor: "100+ employees, regulated industries",
    features: [
      "Everything in Growth",
      "Dedicated infrastructure / VPC",
      "Custom SLA (99.99% uptime)",
      "Audit logs & compliance pack",
      "Dedicated CSM & solutions engineer",
      "Self-hosting option",
      "Custom data residency (India / EU / US)",
      "Unlimited storage",
    ],
    cta: "Talk to sales",
    ctaHref: "/contact?topic=sales",
    highlight: false,
  },
];

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

export function calculateSavingsVsAllInOne(
  seats: number,
  billingPeriod: BillingPeriod = "annual",
): SavingsBreakdown {
  const competitorAnnual = COMPETITOR_PRICES.allInOneErp * seats * 12;
  const streamlinePerSeat =
    billingPeriod === "annual"
      ? (PRICING_TIERS[1].annual ?? 0)
      : (PRICING_TIERS[1].monthly ?? 0);
  const streamlineAnnual = streamlinePerSeat * seats * 12;
  return {
    competitorAnnual,
    streamlineAnnual,
    savings: competitorAnnual - streamlineAnnual,
    savingsPct: Math.round(
      ((competitorAnnual - streamlineAnnual) / competitorAnnual) * 100,
    ),
  };
}

export function calculateSavingsVsStack(seats: number) {
  const stackPerSeat =
    COMPETITOR_PRICES.keka +
    COMPETITOR_PRICES.hubspotStarter +
    COMPETITOR_PRICES.teamChat +
    COMPETITOR_PRICES.notion;
  const stackAnnual = stackPerSeat * seats * 12;
  const streamlineAnnual = (PRICING_TIERS[1].annual ?? 0) * seats * 12;
  return {
    stackAnnual,
    stackPerSeat,
    streamlineAnnual,
    savings: stackAnnual - streamlineAnnual,
    savingsPct: Math.round(
      ((stackAnnual - streamlineAnnual) / stackAnnual) * 100,
    ),
  };
}

export function bundleSavingsCopy(): string {
  return `Typical all-in-one platforms charge ${fmt(COMPETITOR_PRICES.allInOneErp)}/seat or more for the same bundle. StreamlineOS Startup is ${fmt(PRICING_TIERS[1].annual ?? 399)}/seat on annual billing.`;
}

export function cheapestAnnualLabel(): string {
  const cheapest = PRICING_TIERS.find((t) => t.annual && t.annual > 0);
  if (!cheapest || !cheapest.annual) return fmt(399);
  return fmt(cheapest.annual);
}
