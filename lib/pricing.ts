export const PRICING = {
  currency: "₹",
  starterSeatLimit: 3,
  annualDiscountPct: 20,
  freeSeatLimit: 3,
  scaleupPriceInr: 199,
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
    description: "Everything you need to try StreamlineOS with a tiny team.",
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
    ctaHref: "/signup",
    highlight: false,
  },
  {
    id: "startup",
    name: "Startup",
    tagline: "Cheapest all-in-one",
    description:
      "Unlimited seats and the core stack — built for early teams that need to move fast.",
    monthly: 199,
    annual: 149,
    priceLabel: { monthly: fmt(199), annual: fmt(149) },
    price: fmt(199),
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
    ctaHref: "/signup?plan=startup",
    highlight: true,
    badge: "Most popular",
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For scaling teams",
    description:
      "AI assistance, multi-org, SSO, and the controls scaling teams need.",
    monthly: 599,
    annual: 479,
    priceLabel: { monthly: fmt(599), annual: fmt(479) },
    price: fmt(599),
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
    ctaHref: "/signup?plan=growth",
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

export function getTierById(id: PricingTier["id"]): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === id);
}

export function bundleSavingsCopy(): string {
  return "≈ ₹2,500–3,500 per seat if bought separately across HR + Projects + CRM + Chat — Odoo Custom alone is ₹3,115/seat.";
}

export function cheapestAnnualLabel(): string {
  const cheapest = PRICING_TIERS.find((t) => t.annual && t.annual > 0);
  if (!cheapest || !cheapest.annual) return fmt(149);
  return fmt(cheapest.annual);
}
