import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/features/landing/home/marketing-shell";
import { PageHero } from "@/features/landing/home/page-hero";
import { Section, SectionHeading } from "@/features/landing/home/section";
import { FinalCTA } from "@/features/landing/home/final-cta";
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
  type PricingComparisonGroup,
} from "@/features/landing/components/pricing-page-sections";
import { FAQ } from "@/features/landing/home/faq";

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
      { feature: "Every app: HR, CRM, projects, chat, accounting", tiers: [true, true, true, true] },
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
      "Yes. Paid plans include HR, Recruitment, Projects, CRM, Sales, Chat, Calendar, Accounting, Billing, Helpdesk, Customer Success, and more. No per-module fees and no feature upselling.",
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
      <MarketingShell>
        <PageHero
          title="One price per organisation"
          lede="Free, Starter, Professional or Enterprise. Each plan includes a set number of seats. You never pay per seat or per app."
        />

        <Section className="pt-0 sm:pt-0">
          <h2 className="sr-only">Plans</h2>
          <PricingTierGrid tiers={tiers} />
          {notice ? <p className="mt-6 text-center text-xs text-muted-foreground">{notice}</p> : null}
        </Section>

        <Section>
          <SectionHeading title="Compare plans" className="mb-12" />
          <PricingFeatureMatrix groups={comparison} />
        </Section>

        <Section>
          <SectionHeading
            title="What the same team costs elsewhere"
            lede="Move the slider to your team size and compare a year on one plan with a year of per-seat tools."
            className="mb-12"
          />
          <div className="mx-auto max-w-3xl">
            <SavingsCalculator />
          </div>
        </Section>

        <DataResidencySection residency={residency} />

        <FAQ items={pricingFaqs} title="Questions about pricing">
          <p className="mt-6 text-sm text-muted-foreground">
            Not sure which plan fits?{" "}
            <Link href="/contact?topic=sales" className="font-medium text-foreground underline underline-offset-4 hover:text-(--lp-accent)">
              Book a call
            </Link>
          </p>
        </FAQ>

        <FinalCTA />
      </MarketingShell>
    </>
  );
}
