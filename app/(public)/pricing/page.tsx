import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, HelpCircle, Sparkles } from "lucide-react";
import {
  MarketingShell,
  MarketingEyebrow,
} from "@/features/marketing/marketing-shell";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, BRAND_URL } from "@/lib/branding";
import {
  PRICING,
  PRICING_TIERS,
  bundleSavingsCopy,
} from "@/lib/pricing";
import { faqs } from "@/features/landing/data/faqs";
import { FAQJsonLd } from "@/features/seo/structured-data";

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description: `Transparent per-seat pricing for ${BRAND_NAME}. Free for up to 5 seats. Paid plans from ₹399/seat/month with annual billing.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: `${BRAND_URL}/pricing`,
    title: `Pricing — ${BRAND_NAME}`,
    description: `Per-seat pricing for ${BRAND_NAME}. Free tier, no per-module fees, no setup costs.`,
  },
};

const featureMatrix: { feature: string; tiers: (boolean | string)[] }[] = [
  { feature: "Seats", tiers: [`Up to ${PRICING.starterSeatLimit}`, "Unlimited", "Unlimited", "Unlimited"] },
  { feature: "Core HR (employees, leave, attendance)", tiers: [true, true, true, true] },
  { feature: "Projects, sprints, kanban", tiers: [true, true, true, true] },
  { feature: "CRM (leads, deals, pipeline)", tiers: [true, true, true, true] },
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
    question: "Is there really a free plan with no time limit?",
    answer:
      "Yes. The Starter plan is free forever for up to 5 seats. No credit card required. You get all core modules — HR, Projects, CRM, Chat, Calendar — with a generous 5 GB storage allotment per workspace.",
  },
  {
    question: "How does annual billing work?",
    answer:
      "Pay upfront for 12 months and get 20% off the monthly price on every paid plan. You can switch between monthly and annual any time. Unused months on a downgrade are credited to your next invoice.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "All major credit cards, debit cards, UPI, net banking, and NEFT/RTGS via Razorpay. For Enterprise customers we also accept wire transfer and invoice-based billing with NET-30 terms.",
  },
  {
    question: "Can I change plans at any time?",
    answer:
      "Yes. Upgrade or downgrade with one click from your billing settings. Upgrades are prorated to the day; downgrades take effect at the start of your next billing cycle.",
  },
  {
    question: "Do you offer discounts for non-profits, startups, or educational institutions?",
    answer:
      "Yes. Registered non-profits get 50% off Growth and Business plans. Y Combinator and Sequoia Surge startups get the first 12 months free on Growth. Email founders@streamlineos.in with proof of eligibility.",
  },
  {
    question: "What counts as a seat?",
    answer:
      "Any user who logs in. Customers, candidates, contractors, and other external collaborators with portal-only access do not count. Inactive users (no login in 90 days) are not billed.",
  },
  {
    question: "How does the Enterprise plan pricing work?",
    answer:
      "Enterprise starts at ₹1,999 per seat per month with a 250-seat minimum, but is fully customized based on your compliance, deployment, and SLA needs. Contact sales for a precise quote.",
  },
];

export default function PricingPage() {
  return (
    <>
      <FAQJsonLd faqs={[...faqs, ...pricingFaqs]} />
      <MarketingShell>
        <section className="container mx-auto px-4 lg:px-8 max-w-5xl text-center">
          <MarketingEyebrow>Pricing</MarketingEyebrow>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.02] text-slate-900 mb-5">
            One number per seat.{" "}
            <span className="brand-text">Honest as you grow.</span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto mb-3">
            Free for the first 5 seats — forever. Paid plans bundle HR, Projects, CRM, Chat, and
            Calendar at a fraction of the per-tool sum.
          </p>
          <p className="text-slate-500 text-sm">{bundleSavingsCopy()}</p>
        </section>

        <section className="container mx-auto px-4 lg:px-8 max-w-7xl mt-12">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-3xl border p-6 flex flex-col ${
                  tier.highlight
                    ? "border-blue-400/40 bg-white shadow-[0_30px_80px_-24px_rgba(30,64,175,0.28)]"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-[10px] font-mono uppercase tracking-[0.18em] text-white font-bold shadow-lg whitespace-nowrap">
                    <Sparkles className="h-3 w-3" />
                    {tier.badge}
                  </div>
                )}
                <h3 className="font-display text-xl font-bold text-slate-900">{tier.name}</h3>
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-blue-600 mb-4">
                  {tier.tagline}
                </p>
                <div className="mb-5 pb-5 border-b border-slate-100">
                  <p className="font-display text-4xl font-extrabold text-slate-900 leading-none">
                    {tier.priceLabel.annual}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1.5">
                    {tier.period}
                    {tier.monthly && tier.monthly > 0 && (
                      <span className="ml-1.5 text-emerald-600 font-semibold">
                        billed annually
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-slate-600 mt-3 leading-relaxed">
                    {tier.description}
                  </p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[12.5px] text-slate-700 leading-relaxed"
                    >
                      <span className="mt-0.5 h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={tier.ctaHref} className="block">
                  <Button
                    variant={tier.highlight ? "default" : "outline"}
                    className="w-full h-10"
                  >
                    {tier.cta}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </Link>
                <p className="mt-3 text-[10.5px] font-mono uppercase tracking-[0.12em] text-slate-400 text-center">
                  {tier.bestFor}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 lg:px-8 max-w-6xl mt-20">
          <div className="text-center mb-8">
            <MarketingEyebrow>Compare</MarketingEyebrow>
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-[-0.02em] text-slate-900">
              Feature-by-feature comparison
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-3 px-4 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-500 min-w-[260px]">
                      Feature
                    </th>
                    {PRICING_TIERS.map((tier) => (
                      <th
                        key={tier.id}
                        className="py-3 px-4 text-[12px] font-semibold text-slate-900 text-center min-w-[140px]"
                      >
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}
                    >
                      <td className="py-3 px-4 text-[13px] text-slate-700">{row.feature}</td>
                      {row.tiers.map((value, j) => (
                        <td
                          key={j}
                          className="py-3 px-4 text-[13px] text-slate-700 text-center"
                        >
                          {typeof value === "boolean" ? (
                            value ? (
                              <Check className="h-4 w-4 text-emerald-600 inline-block" strokeWidth={3} />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )
                          ) : (
                            <span className="text-[12px] font-medium">{value}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 lg:px-8 max-w-3xl mt-20">
          <div className="text-center mb-8">
            <MarketingEyebrow>Frequently asked</MarketingEyebrow>
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-[-0.02em] text-slate-900">
              Pricing questions
            </h2>
          </div>
          <div className="space-y-3">
            {pricingFaqs.map((f) => (
              <details
                key={f.question}
                className="group rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5"
              >
                <summary className="cursor-pointer list-none flex items-start gap-3">
                  <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span className="flex-1 font-semibold text-slate-900 text-[14.5px]">
                    {f.question}
                  </span>
                </summary>
                <p className="mt-3 ml-7 text-[13.5px] text-slate-600 leading-relaxed">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 lg:px-8 max-w-3xl mt-16 mb-4">
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 to-slate-800 p-8 lg:p-10 text-center text-white shadow-[0_30px_80px_-24px_rgba(15,23,42,0.5)]">
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-[-0.02em] mb-3">
              Still deciding? We&apos;ll help you scope it.
            </h2>
            <p className="text-slate-300 text-[15px] leading-relaxed mb-6 max-w-xl mx-auto">
              30-minute call with a founder. We&apos;ll map your current stack to StreamlineOS and
              tell you honestly whether it fits — or which competitor would.
            </p>
            <Link
              href="/contact?topic=sales"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              Book a call
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </MarketingShell>
    </>
  );
}
