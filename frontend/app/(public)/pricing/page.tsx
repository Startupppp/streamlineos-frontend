import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Layers, Sparkles } from "lucide-react";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, BRAND_URL } from "@/lib/branding";
import { PRICING, COMPETITOR_PRICES, cheapestAnnualLabel } from "@/lib/pricing";
import { faqs } from "@/features/landing/data/faqs";
import { FAQJsonLd } from "@/features/seo/structured-data";
import { PricingTierGrid } from "@/features/landing/components/pricing-tier-grid";
import { SavingsCalculator } from "@/features/landing/components/savings-calculator";
import {
  PricingFeatureMatrix,
  PricingFaqAccordion,
} from "@/features/landing/components/pricing-page-sections";

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description: `From ${cheapestAnnualLabel()}/seat/month annual. Free forever for ${PRICING.freeSeatLimit} seats. All apps in one plan.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: `${BRAND_URL}/pricing`,
    title: `Pricing — ${BRAND_NAME}`,
    description: `From ${cheapestAnnualLabel()}/seat/month on annual billing. Free tier, no per-module fees.`,
  },
};

const featureMatrix: { feature: string; tiers: (boolean | string)[] }[] = [
  { feature: "Seats", tiers: [`Up to ${PRICING.starterSeatLimit}`, "Unlimited", "Unlimited", "Unlimited"] },
  { feature: "All apps (HR, CRM, Projects, Chat, Accounting…)", tiers: [true, true, true, true] },
  { feature: "Core HR (employees, leave, attendance)", tiers: [true, true, true, true] },
  { feature: "Recruitment & ATS", tiers: [true, true, true, true] },
  { feature: "Projects, sprints, kanban", tiers: [true, true, true, true] },
  { feature: "CRM (leads, deals, pipeline)", tiers: [true, true, true, true] },
  { feature: "Accounting & billing", tiers: [true, true, true, true] },
  { feature: "Helpdesk & knowledge base", tiers: [true, true, true, true] },
  { feature: "Real-time chat & calendar", tiers: [true, true, true, true] },
  { feature: "Storage per workspace", tiers: ["5 GB", "100 GB", "1 TB", "Unlimited"] },
  { feature: "Workflow automation", tiers: [false, true, true, true] },
  { feature: "Custom roles & permissions", tiers: [false, true, true, true] },
  { feature: "Public API access", tiers: [false, true, true, true] },
  { feature: "AI assistance (Gemini / OpenAI)", tiers: [false, false, true, true] },
  { feature: "Multi-org / multi-branch", tiers: [false, false, true, true] },
  { feature: "SAML SSO + SCIM", tiers: [false, false, true, true] },
  { feature: "Advanced analytics & scheduled reports", tiers: [false, false, true, true] },
  { feature: "Audit logs & compliance pack", tiers: [false, false, false, true] },
  { feature: "Dedicated infrastructure / VPC", tiers: [false, false, false, true] },
  { feature: "Custom data residency", tiers: [false, false, false, true] },
  { feature: "Self-hosting option", tiers: [false, false, false, true] },
  { feature: "Custom SLA (99.99% uptime)", tiers: [false, false, false, true] },
  {
    feature: "Support",
    tiers: ["Community", "Email & chat", "Priority (4hr)", "Dedicated CSM + SE"],
  },
];

const pricingFaqs = [
  {
    question: "Do I really get every app for a single price?",
    answer:
      "Yes. Paid plans include HR, Recruitment, Projects, CRM, Sales, Chat, Calendar, Accounting, Billing, Helpdesk, Customer Success, and more — no per-module fees and no feature upselling.",
  },
  {
    question: "How does pricing compare to other all-in-one platforms?",
    answer: `Many all-in-one business platforms charge around ₹${COMPETITOR_PRICES.allInOneErp} per seat per month for a full app bundle. Our Startup plan is ${cheapestAnnualLabel()} per seat per month on annual billing — every app included, no per-module fees.`,
  },
  {
    question: "Is there really a free plan with no time limit?",
    answer: `Yes. The Free plan works forever for up to ${PRICING.starterSeatLimit} seats. No credit card required. You get all core apps with 5 GB storage per workspace.`,
  },
  {
    question: "What counts as a paying user?",
    answer:
      "Any user who logs into the backend. Customers, candidates, and portal-only external users do not count as seats.",
  },
  {
    question: "How does annual billing work?",
    answer: `Pay upfront for 12 months and save ${PRICING.annualDiscountPct}% off the monthly price on every paid plan.`,
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "Credit cards, debit cards, UPI, net banking, and NEFT/RTGS via Razorpay. Enterprise customers can use wire transfer with NET-30 terms.",
  },
  {
    question: "Can I change plans at any time?",
    answer:
      "Yes. Upgrade or downgrade from billing settings. Upgrades are prorated; downgrades take effect at the next billing cycle.",
  },
  {
    question: "Do you offer discounts for non-profits or startups?",
    answer:
      "Registered non-profits get 50% off Startup and Growth. YC, Sequoia Surge, and Antler portfolio startups get 12 months free on Startup. Email founders@streamlineos.in with proof.",
  },
];

const highlights = [
  {
    icon: Sparkles,
    label: `${cheapestAnnualLabel()} / seat`,
    detail: "on annual billing",
  },
  {
    icon: BadgeCheck,
    label: "Every app included",
    detail: "no per-module fees",
  },
  {
    icon: Layers,
    label: `Free for ${PRICING.starterSeatLimit} seats`,
    detail: "no credit card required",
  },
];

export default function PricingPage() {
  return (
    <>
      <FAQJsonLd faqs={[...faqs, ...pricingFaqs]} />
      <PublicShell>
        {/* Hero */}
        <section className="container mx-auto px-4 lg:px-8 max-w-3xl text-center">
          <PublicEyebrow>Pricing</PublicEyebrow>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
            Simple pricing.{" "}
            <span className="text-blue-600">Every app included.</span>
          </h1>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            One price per seat. No per-module fees, no surprise upsells — just the full platform
            for your team.
          </p>

          <div className="mt-8 flex flex-wrap items-stretch justify-center gap-3">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm min-w-[200px]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="block text-xs text-slate-500">{item.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section className="mt-14 lg:mt-16">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
            <PricingTierGrid showAppsGrid />
          </div>
        </section>

        {/* Savings */}
        <section className="mt-20 lg:mt-24 border-t border-slate-200/80 bg-slate-50/60">
          <div className="container mx-auto px-4 lg:px-8 max-w-3xl py-16 lg:py-20">
            <div className="text-center mb-10">
              <PublicEyebrow>Savings</PublicEyebrow>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                See what you&apos;d save
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Compare StreamlineOS against typical all-in-one platforms and a per-tool stack.
              </p>
            </div>
            <SavingsCalculator />
          </div>
        </section>

        {/* Feature matrix */}
        <section className="mt-0">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl py-16 lg:py-20">
            <div className="text-center mb-10">
              <PublicEyebrow>Compare</PublicEyebrow>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Plan comparison
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
                All paid plans include every app. Differences are scale, AI, and enterprise
                controls.
              </p>
            </div>
            <PricingFeatureMatrix rows={featureMatrix} />
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-slate-200/80 bg-slate-50/60">
          <div className="container mx-auto px-4 lg:px-8 max-w-2xl py-16 lg:py-20">
            <div className="text-center mb-10">
              <PublicEyebrow>FAQ</PublicEyebrow>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Common questions
              </h2>
            </div>
            <PricingFaqAccordion items={pricingFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 lg:px-8 max-w-2xl pb-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Not sure which plan fits?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Book a 30-minute call with a founder. We&apos;ll map your stack and tell you honestly
              whether StreamlineOS is the right fit.
            </p>
            <Link href="/contact?topic=sales" className="inline-block mt-6">
              <Button className="h-11 px-6">
                Book a call
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </section>
      </PublicShell>
    </>
  );
}
