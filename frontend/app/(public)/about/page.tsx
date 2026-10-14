import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Heart, Layers, Lock } from "lucide-react";
import { FinalCTA } from "@/features/landing/home/final-cta";
import { MarketingShell } from "@/features/landing/home/marketing-shell";
import { PageHero } from "@/features/landing/home/page-hero";
import { MODULE_COUNT } from "@/features/landing/home/areas";
import { Section, SectionHeading } from "@/features/landing/home/section";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/branding";
import { PRICING } from "@/lib/pricing";

export const metadata: Metadata = {
  title: `About ${BRAND_NAME}`,
  description: `${BRAND_TAGLINE}. The team and the thinking behind ${BRAND_NAME}.`,
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: Layers,
    title: "One product, end to end",
    body: "We chose the harder thing: a single data model for HR, projects and CRM. No connectors, no Zaps, no exports. The information your company runs on lives in one place.",
  },
  {
    icon: Lock,
    title: "Boring infrastructure",
    body: "Postgres, TypeScript and server-rendered HTML. We optimise for things that will still work in ten years, not for what is fashionable this year.",
  },
  {
    icon: Heart,
    title: "Built with the people using it",
    body: "Every feature ships only after a real team has run their week through it. We prioritise what HR managers, founders and sales leads actually do on Monday morning.",
  },
  {
    icon: Compass,
    title: "Default to honest",
    body: "Honest pricing and honest changelogs. We tell you what broke before you find out, and we turn down customers we can't serve well.",
  },
];

const facts = [
  { value: "2026", label: "Founded" },
  { value: String(MODULE_COUNT), label: "Modules in one workspace" },
  { value: "₹0", label: `For up to ${PRICING.freeSeatLimit} seats` },
  { value: "100%", label: "Founder-owned" },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <PageHero
        title="We’re building the operating system teams actually use"
        lede="Most companies run on disconnected tools: HR in one place, sales in another, projects in a third. Every Monday someone copies numbers between them. We built something different."
      />

      <Section className="pt-0 sm:pt-0">
        <dl className="lp-card mx-auto grid max-w-5xl grid-cols-2 gap-y-8 rounded-3xl p-8 text-center lg:grid-cols-4 lg:divide-x lg:divide-(--lp-rule)">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col-reverse px-4">
              <dt className="mt-2 text-sm text-muted-foreground">{fact.label}</dt>
              <dd className="lp-display text-5xl text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-12">
          <SectionHeading
            align="left"
            title="One workspace, because every other path felt wrong"
            className="lg:col-span-5"
          />
          <div className="max-w-2xl space-y-5 leading-relaxed text-foreground lg:col-span-7">
            <p>
              Before {BRAND_NAME}, we ran teams the way most teams still do: one tool for HR, one for
              projects, one for sales, one for chat. Every new hire meant five logins. Every weekly report
              meant spreadsheet exports.
            </p>
            <p>
              We tried the existing all-in-one platforms. They were either shallow in every module or held
              together by integrations that broke whenever a vendor changed its API. We wanted one data
              model: the same employee record and the same client record, used by everything.
            </p>
            <p>
              So we built it. In {BRAND_NAME}, the candidate you interview becomes the employee on payroll,
              then the project lead, then the account owner on a deal. One person, one identity, across every
              team. Nothing to sync and nothing to drift.
            </p>
            <p>
              We are still early and the product changes every week. The idea has not: companies deserve
              software that doesn&apos;t make them open seven tabs to understand their own week.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Four principles we won’t move on" />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <li key={value.title} className="lp-card rounded-3xl p-7">
              <span className="flex size-11 items-center justify-center rounded-full bg-(--lp-accent-soft) text-(--lp-accent)">
                <value.icon className="size-5" aria-hidden />
              </span>
              <h3 className="lp-display mt-5 text-3xl text-foreground">{value.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{value.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Want to build with us? We are a small founding team.{" "}
          <Link href="/contact" className="font-medium text-foreground underline underline-offset-4 hover:text-(--lp-accent)">
            Get in touch
          </Link>
        </p>
      </Section>

      <FinalCTA />
    </MarketingShell>
  );
}
