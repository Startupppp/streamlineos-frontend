import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/features/landing/public-shell";
import { Badge } from "@/features/landing/relay/components/ui/badge";
import { DisplayTitle } from "@/features/landing/relay/components/ui/display-title";
import { SectionHead } from "@/features/landing/relay/components/ui/section-head";
import { REVEAL } from "@/features/landing/relay/lib/motion";
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
  title: "Pricing",
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
      { feature: "Workflows and API", tiers: [false, true, true, true] },
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
        
        <div className="relay-ui mx-page flex w-page flex-col gap-section-gap px-page-inset">
          <header className="flex flex-col items-center gap-6 pt-12 text-center w768:pt-6 w390:gap-4">
            <Badge label="pricing" />
            <DisplayTitle
              tag="h1"
              still
              before="One price per "
              accent="organisation"
              after="."
              delay={REVEAL.step}
              className="max-w-240 text-hero-title leading-hero-title"
              accentClassName="text-hero-title-accent"
            />
            <p              className="max-w-150 text-lead leading-lead text-foreground-muted w390:text-body w390:leading-body">
              Free, Starter, Professional, or Enterprise. Seat caps sit on the plan. There is no per-seat meter and no per-app fee.
            </p>
          </header>

          <section aria-label="Plans">
            <PricingTierGrid showAppsGrid={false} tiers={tiers} />
            {notice ? (
              <p className="mt-6 text-center text-relay-label leading-label text-foreground-muted">{notice}</p>
            ) : null}
          </section>

          <section aria-label="Compare plans" className="flex flex-col gap-12 w1024:gap-10 w390:gap-8">
            <SectionHead
              badge="compare"
              title={{ before: "Compare ", accent: "plans", after: "." }}
              aside="Every plan runs every app. What changes is how many people, how much storage, and the controls a larger team needs."
            />
            <PricingFeatureMatrix groups={comparison} />
          </section>

          <section aria-label="Savings calculator" className="flex flex-col gap-12 w1024:gap-10 w390:gap-8">
            <SectionHead
              badge="savings"
              title={{ before: "What the same team costs ", accent: "elsewhere", after: "." }}
              aside="Move the slider to your headcount and compare a year on StreamlineOS against a per-seat platform or a stack of separate tools."
            />
            <SavingsCalculator />
          </section>

          <DataResidencySection residency={residency} />

          <section aria-label="Pricing questions" className="flex flex-col gap-12 w1024:gap-10 w390:gap-8">
            <SectionHead
              badge="faq"
              title={{ before: "Pricing, ", accent: "answered", after: "." }}
              aside="Billing, seats, discounts and plan changes — what teams ask before they pick a plan."
            />
            <PricingFaqAccordion items={pricingFaqs} />
            <p className="text-center text-body leading-body text-foreground-muted">
              Not sure which plan fits?{" "}
              <Link
                href="/contact?topic=sales"
                className="font-medium text-accent-soft underline underline-offset-4 transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Book a call
              </Link>
            </p>
          </section>
        </div>
      </PublicShell>
    </>
  );
}
