export const PRICING = {
  freeSeatLimit: 10,
  scaleupPriceInr: 499,
  currency: "₹",
} as const;

export type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Startup",
    price: `${PRICING.currency}0`,
    period: `for the first ${PRICING.freeSeatLimit} seats`,
    description: "Everything you need to run a small team — free, forever.",
    features: [
      "All core modules",
      `Up to ${PRICING.freeSeatLimit} seats`,
      "Real-time chat & calendar",
      "Community support",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Scaleup",
    price: `${PRICING.currency}${PRICING.scaleupPriceInr}`,
    period: "per seat / month",
    description: "For growing companies that need automation, AI, and multi-branch.",
    features: [
      "Everything in Startup",
      "AI assistance & scoring",
      "Multi-branch, multi-org",
      "Workflow automation",
      "Scheduled reports",
      "Priority support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored to your org",
    description: "For organizations with compliance, SSO, and dedicated infra needs.",
    features: [
      "Everything in Scaleup",
      "SSO / SAML",
      "Dedicated infrastructure",
      "Audit & compliance pack",
      "SLA & dedicated CSM",
      "Self-host option",
    ],
    cta: "Talk to sales",
    highlight: false,
  },
];
