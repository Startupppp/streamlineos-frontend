import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Heart, Layers, Lock, Sparkles } from "lucide-react";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { Badge } from "@/features/landing/relay/components/ui/badge";
import { BrandCta } from "@/features/landing/relay/components/ui/brand-cta";
import { DisplayTitle } from "@/features/landing/relay/components/ui/display-title";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/branding";

export const metadata: Metadata = {
  title: `About ${BRAND_NAME}`,
  description: `${BRAND_TAGLINE} — the team and the thinking behind ${BRAND_NAME}.`,
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: Layers,
    title: "One product, end-to-end",
    body: "We chose the harder thing: a single data model for HR, projects, and CRM. No connectors, no Zaps, no exports. The information your company runs on lives in one place.",
  },
  {
    icon: Lock,
    title: "Boring infrastructure",
    body: "Postgres. TypeScript. Server-rendered HTML. No clever frameworks. We optimize for things that will still work in ten years, not for what's on the conference circuit this year.",
  },
  {
    icon: Heart,
    title: "Built with the people using it",
    body: "Every feature ships only after a real team has run their week through it. We prioritize what HR managers, founders, and sales leads actually do on Monday morning.",
  },
  {
    icon: Compass,
    title: "Default to honest",
    body: "Honest pricing. Honest changelogs. We tell you what broke before you find out. We turn down customers we can't serve well. We don't pretend to be a category we're not.",
  },
];

const numbers = [
  { value: "2026", label: "Founded" },
  { value: "30+", label: "Modules shipped" },
  { value: "\u20B90", label: "Up to 5 seats" },
  { value: "100%", label: "Founder-owned" },
];

const SECTION_TITLE = "text-section-title leading-section-title";
const SECTION_ACCENT = "text-section-title-accent";

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="mx-page flex w-page flex-col px-page-inset">
        <section className="flex max-w-240 flex-col items-start w768:items-center w768:text-center">
          <PublicEyebrow>{`About ${BRAND_NAME}`}</PublicEyebrow>
          <DisplayTitle
            tag="h1"
            still
            before="We're building the operating system "
            accent="teams actually use"
            after="."
            className="text-hero-title leading-hero-title"
            accentClassName="text-hero-title-accent"
          />
          <p className="mt-6 max-w-190 text-lead leading-lead text-foreground-muted w390:text-body w390:leading-body">
            Most companies run on a graveyard of disconnected tools. HR in one place. Sales in
            another. Sprints in a third. Chat in a fourth. Every Monday morning, someone copy-pastes
            numbers between them. We thought that was strange. So we built something different.
          </p>
        </section>

        <div aria-hidden="true" className="h-section-gap" />

        <section aria-label={`${BRAND_NAME} in numbers`}>
          <dl className="grid grid-cols-4 overflow-clip rounded-footer-panel border border-border-subtle bg-card-glass backdrop-blur-card w768:grid-cols-2">
            {numbers.map((n) => (
              <div
                key={n.label}
                className="flex flex-col-reverse items-center gap-2 border-border-subtle px-6 py-8 text-center not-first:border-l w768:not-first:border-l-0 w768:even:border-l w768:nth-[n+3]:border-t"
              >
                <dt className="text-relay-label leading-label font-medium text-foreground-muted">
                  {n.label}
                </dt>
                <dd className="bg-linear-to-b/srgb from-title-gradient-from to-title-gradient-to bg-clip-text text-section-title leading-section-title font-semibold tracking-title text-transparent">
                  {n.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div aria-hidden="true" className="h-section-gap" />

        <section className="grid grid-cols-12 gap-12 w768:grid-cols-1 w768:gap-8">
          <div className="col-span-5 flex flex-col items-start w768:col-span-1 w768:items-center w768:text-center">
            <PublicEyebrow>Our story</PublicEyebrow>
            <DisplayTitle
              before="One workspace, because "
              accent="every other path"
              after=" felt wrong."
              className={SECTION_TITLE}
              accentClassName={SECTION_ACCENT}
            />
          </div>
          <div className="col-span-7 flex flex-col gap-5 text-lead leading-lead text-foreground-muted w768:col-span-1 w390:text-body w390:leading-body">
            <p>
              Before {BRAND_NAME}, we ran teams the way most teams still do — one SaaS for HR, one
              for sprints, one for sales, one for chat, one for the weekly status meeting. Every
              new hire meant five logins. Every weekly report meant CSV exports and pivot tables.
            </p>
            <p>
              We tried the existing &ldquo;all in one&rdquo; platforms. They were either shallow on
              every module or built on top of bolt-on integrations that broke whenever a vendor
              shipped a new API. We wanted something with one data model — the same employee
              record, the same client record, used by everything.
            </p>
            <p>
              So we built it. {BRAND_NAME} is a single platform where the candidate you
              interviewed becomes the employee on payroll becomes the project lead on a sprint
              becomes the account owner on a deal. The same person, with one identity, across
              every function. No syncs. No drift. No 4 AM Zapier alerts.
            </p>
            <p>
              We&apos;re still early. The product changes every week. But the thesis hasn&apos;t —
              companies deserve software that doesn&apos;t make them sit in front of seven tabs to
              understand what&apos;s happening this Wednesday.
            </p>
          </div>
        </section>

        <div aria-hidden="true" className="h-section-gap" />

        <section className="flex flex-col gap-12 w1024:gap-10 w390:gap-8">
          <div className="flex flex-col items-center text-center">
            <PublicEyebrow>What we care about</PublicEyebrow>
            <DisplayTitle
              before="Four principles we "
              accent="won't move on"
              after="."
              className={SECTION_TITLE}
              accentClassName={SECTION_ACCENT}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 w768:grid-cols-1">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <article
                  key={v.title}
                  className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-card-glass p-8 backdrop-blur-card w390:p-6"
                >
                  <span className="mb-2 inline-flex size-11 items-center justify-center rounded-xl bg-linear-135 from-brand-from to-brand-to text-on-accent shadow-float">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="text-lead leading-lead font-medium text-foreground">{v.title}</h3>
                  <p className="text-body leading-body text-foreground-muted">{v.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <div aria-hidden="true" className="h-section-gap" />

        <section className="relative overflow-clip rounded-footer-panel border border-footer-panel-border bg-linear-160 from-footer-panel-from via-footer-panel-via to-footer-panel-to px-10 py-16 text-center shadow-float w768:px-6 w768:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-160 -translate-x-1/2 rounded-full bg-brand-from opacity-25 blur-3xl"
          />
          <div className="relative flex flex-col items-center">
            <Badge label="We're hiring soon" className="mb-6" />
            <DisplayTitle
              before="Want to "
              accent="build with us"
              after="?"
              className={SECTION_TITLE}
              accentClassName={SECTION_ACCENT}
            />
            <p className="mt-4 mb-8 max-w-140 text-body leading-body text-foreground-muted">
              We&apos;re a small founding team. If the way we work resonates, reach out — even if
              we don&apos;t have a role open in your discipline yet.
            </p>
            <BrandCta label="Get in touch" href="/contact" className="h-13 px-8 text-body" />
          </div>
        </section>

        <p className="mt-12 inline-flex items-center justify-center gap-2 text-center text-relay-label leading-label text-foreground-muted">
          <Sparkles className="size-3.5 text-accent-soft" aria-hidden />
          <span>
            More about what we&apos;re shipping next on{" "}
            <Link
              href="/blogs"
              className="rounded-sm text-accent-soft underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent-soft"
            >
              the blog
            </Link>
          </span>
        </p>
      </div>
    </PublicShell>
  );
}
