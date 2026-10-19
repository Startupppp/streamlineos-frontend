/**
 * 09 Pricing — Figma 3488:22781 layout, StreamlineOS plans from
 * `plan-entitlements.constants.ts`: monthly INR, annual billing saves 20%,
 * 14-day free trial on paid plans. `seats` drives the people slider.
 */
const APP_URL = "https://app.streamlineos.in";

export const pricingMock = {
  head: {
    badge: "pricing",
    title: { before: "Start free. Pay as the ", accent: "team", after: " grows." },
    aside:
      "Monthly prices in INR. Annual billing saves 20%, and every paid plan starts with a 14-day free trial.",
  },
  meter: {
    eyebrow: "estimate",
    question: "How many people will use it?",
    resultEyebrow: "your plan",
    unit: "people",
    cta: { label: "Start free", href: APP_URL },
  },
  /** `size` — Figma sets a few feature lines at 16/24 instead of 14/20. */
  tiers: [
    {
      name: "Free",
      price: "₹0",
      seats: 5,
      seatsLabel: "up to 5 people",
      period: "free forever",
      featured: false,
      features: [
        { label: "up to 5 people", size: "label" },
        { label: "HR, Projects, CRM, Chat", size: "label" },
        { label: "5 GB storage", size: "label" },
        { label: "community support", size: "label" },
      ],
      cta: { label: "Start free", href: APP_URL },
    },
    {
      name: "Starter",
      price: "₹999",
      seats: 10,
      seatsLabel: "up to 10 people",
      period: "a month",
      featured: true,
      tag: "most popular",
      features: [
        { label: "up to 10 people", size: "label" },
        { label: "core HR and attendance", size: "label" },
        { label: "payroll and leave", size: "label" },
        { label: "email support", size: "label" },
      ],
      cta: { label: "Start free trial", href: APP_URL },
    },
    {
      name: "Professional",
      price: "₹2,499",
      seats: 50,
      seatsLabel: "up to 50 people",
      period: "a month",
      featured: false,
      features: [
        { label: "up to 50 people", size: "label" },
        { label: "recruitment and OKRs", size: "label" },
        { label: "CRM and sales tools", size: "label" },
        { label: "priority support", size: "label" },
      ],
      cta: { label: "Start free trial", href: APP_URL },
    },
    {
      name: "Enterprise",
      price: "₹4,999",
      seats: 500,
      seatsLabel: "500 people, or negotiated",
      period: "a month, starting price",
      featured: false,
      features: [
        { label: "500 seats or negotiated", size: "label" },
        { label: "advanced analytics", size: "label" },
        { label: "custom integrations", size: "label" },
        { label: "dedicated manager, SLA", size: "label" },
      ],
      cta: { label: "Talk to sales", href: "mailto:sales@streamlineos.in" },
    },
  ],
} as const;

export type PricingContent = typeof pricingMock;
