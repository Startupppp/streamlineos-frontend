import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { BRAND_NAME, BRAND_URL, BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import {
  PRICING,
  COMPETITOR_PRICES,
  cheapestAnnualLabel,
} from "@/lib/pricing";
import { faqs } from "@/features/landing/data/faqs";
import { FAQJsonLd } from "@/features/seo/structured-data";
import { PricingTierGrid } from "@/features/landing/components/pricing-tier-grid";
import { DataResidencySection } from "@/features/landing/components/data-residency-section";
import {
  applyLivePrices,
  currencyNotice,
  fetchDataResidency,
  fetchPublicPricing,
} from "@/lib/pricing-live";
import { SavingsCalculator } from "@/features/landing/components/savings-calculator";
import {
  PricingFeatureMatrix,
  PricingFaqAccordion,
  type PricingComparisonGroup,
} from "@/features/landing/components/pricing-page-sections";

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description: `From ${cheapestAnnualLabel()} per organisation / month on annual billing. Free for ${PRICING.freeSeatLimit} seats. Every app in one plan.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: `${BRAND_URL}/pricing`,
    title: `Pricing — ${BRAND_NAME}`,
    description: `From ${cheapestAnnualLabel()} per organisation / month on annual billing. Free tier, no per-module fees.`,
  },
};

const comparison: PricingComparisonGroup[] = [
  {
    title: "Workspace",
    rows: [
      { feature: "Seats", tiers: [`Up to ${PRICING.freeSeatLimit}`, "Up to 10", "Up to 50", "Negotiated"] },
      { feature: "Storage", tiers: [`${PRICING.freeStorageGb} GB`, `${PRICING.starterStorageGb} GB`, "1 TB", "Unlimited"] },
      { feature: "Every app — HR, CRM, projects, chat, accounting", tiers: [true, true, true, true] },
    ],
  },
  {
    title: "Scale",
    rows: [
      { feature: "Workflows, custom roles, and API", tiers: [false, true, true, true] },
      { feature: "AI assistance and advanced reports", tiers: [false, false, true, true] },
      { feature: "SSO and multi-branch", tiers: [false, false, true, true] },
    ],
  },
  {
    title: "Enterprise",
    rows: [
      { feature: "Audit logs, residency, and custom SLA", tiers: [false, false, false, true] },
      { feature: "Support", tiers: ["Community", "Email", "Priority", "Dedicated"] },
    ],
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
    answer: `Many all-in-one platforms charge about ₹${COMPETITOR_PRICES.allInOneErp} per seat per month. Starter is ${cheapestAnnualLabel()} per organisation per month on annual billing, with a seat cap on the plan rather than a per-seat price.`,
  },
  {
    question: "Is there really a free plan with no time limit?",
    answer: `Yes. Free works forever for up to ${PRICING.freeSeatLimit} seats. No credit card. Core apps and ${PRICING.freeStorageGb} GB of storage are included.`,
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
    answer: `Registered non-profits get 50% off Starter and Professional. YC, Sequoia Surge, and Antler portfolio startups get 12 months free on Starter. Email ${BRAND_SUPPORT_EMAIL} with proof.`,
  },
];

/**
 * Ticket 12. The prices and the residency list are read from the public API at
 * request time, so this page quotes the number the checkout will actually
 * charge, in the visitor's currency rather than always in rupees.
 *
 * Both reads are allowed to fail. `applyLivePrices(null)` is the compiled-in
 * table and `DataResidencySection` renders nothing without an answer -- a
 * marketing page that 500s because an API is slow costs more than a stale price.
 *
 * `?currency=` and `?country=` rather than sniffing headers: a visitor who wants
 * to see euros can ask for them, and the result is a URL that can be shared and
 * cached.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ currency?: string; country?: string }>;
}) {
  const params = (await searchParams) ?? {};

  const [livePricing, residency] = await Promise.all([
    fetchPublicPricing(params.currency),
    fetchDataResidency(params.country),
  ]);

  const tiers = applyLivePrices(livePricing);
  const notice = currencyNotice(livePricing);

  return (
    <>
      <FAQJsonLd faqs={[...faqs, ...pricingFaqs]} />
      <PublicShell>
        <section className="container mx-auto max-w-2xl px-4 text-center lg:px-8">
          <PublicEyebrow>Pricing</PublicEyebrow>
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            One price per organisation.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Free, Starter, Professional, or Enterprise. Seat caps sit on the plan. There is no per-seat meter and no per-app fee.
          </p>
        </section>

        <section className="mt-10">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <PricingTierGrid showAppsGrid={false} tiers={tiers} />
            {notice ? (
              <p className="mt-6 text-center text-xs text-muted-foreground">{notice}</p>
            ) : null}
          </div>
        </section>

        <section className="mt-16">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8">
            <h2 className="mb-6 text-center font-display text-2xl font-bold tracking-tight text-foreground">
              Compare plans
            </h2>
            <PricingFeatureMatrix groups={comparison} />
          </div>
        </section>

        <section className="mt-16 border-t border-border bg-muted">
          <div className="container mx-auto max-w-3xl px-4 py-14 lg:px-8">
            <h2 className="mb-8 text-center font-display text-2xl font-bold tracking-tight text-foreground">
              What the same team costs elsewhere
            </h2>
            <SavingsCalculator />
          </div>
        </section>

        <DataResidencySection residency={residency} />

        <section className="border-t border-border">
          <div className="container mx-auto max-w-2xl px-4 py-14 lg:px-8">
            <h2 className="mb-6 text-center font-display text-2xl font-bold tracking-tight text-foreground">
              Questions
            </h2>
            <PricingFaqAccordion items={pricingFaqs} />
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Not sure which plan fits?{" "}
              <Link href="/contact?topic=sales" className="font-medium text-foreground underline-offset-4 hover:underline">
                Book a call
              </Link>
            </p>
          </div>
        </section>
      </PublicShell>
    </>
  );
}
