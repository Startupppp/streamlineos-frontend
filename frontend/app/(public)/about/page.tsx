import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Heart, Layers, Lock, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
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
  { value: "â‚¹0", label: "Below 10 seats" },
  { value: "100%", label: "Founder-owned" },
];

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="container mx-auto px-4 lg:px-8 max-w-5xl">
        <PublicEyebrow>About {BRAND_NAME}</PublicEyebrow>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.02] text-foreground mb-6">
          We&apos;re building the operating system{" "}
          <span className="text-status-info-ink">teams actually use.</span>
        </h1>
        <p className="text-muted-foreground text-lg lg:text-xl leading-relaxed max-w-3xl">
          Most companies run on a graveyard of disconnected tools. HR in one place. Sales in
          another. Sprints in a third. Chat in a fourth. Every Monday morning, someone copy-pastes
          numbers between them. We thought that was strange. So we built something different.
        </p>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-5xl mt-16 lg:mt-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl glass-panel-strong overflow-hidden">
          {numbers.map((n) => (
            <div key={n.label} className="px-6 py-8 text-center bg-white/70 backdrop-blur">
              <p className="font-display text-3xl lg:text-4xl font-extrabold text-status-info-ink leading-none mb-1.5">
                {n.value}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {n.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-5xl mt-20 lg:mt-28 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <PublicEyebrow>Our story</PublicEyebrow>
          <h2 className="font-display text-3xl lg:text-4xl font-extrabold tracking-[-0.025em] leading-[1.05] text-foreground">
            One workspace, because every other path felt wrong.
          </h2>
        </div>
        <div className="lg:col-span-8 space-y-5 text-sm lg:text-base text-foreground leading-relaxed">
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

      <section className="container mx-auto px-4 lg:px-8 max-w-6xl mt-20 lg:mt-28">
        <div className="text-center mb-12">
          <PublicEyebrow>What we care about</PublicEyebrow>
          <h2 className="font-display text-3xl lg:text-4xl font-extrabold tracking-[-0.025em] leading-[1.05] text-foreground">
            Four principles we won&apos;t move on.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-2xl border border-border bg-white/70 backdrop-blur-sm p-7"
              >
                <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-gradient-info-from to-gradient-info-to inline-flex items-center justify-center mb-4 shadow-[0_8px_18px_-6px_rgba(59,130,246,0.5)]">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-5xl mt-20 lg:mt-28">
        <div className="relative rounded-2xl overflow-hidden bg-status-neutral-fill p-10 lg:p-14 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-[280px] w-[560px] rounded-full bg-status-info-surface blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3.5 py-1.5 mb-5">
              <Users className="h-3 w-3 text-status-info-ink" />
              <span className="text-xs font-medium text-status-info-ink">
                We&apos;re hiring soon
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.025em] text-white mb-4 leading-[1.05]">
              Want to build with us?
            </h2>
            <p className="text-status-info-ink text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-7">
              We&apos;re a small founding team. If the way we work resonates, reach out — even if
              we don&apos;t have a role open in your discipline yet.
            </p>
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-white text-foreground hover:bg-status-info-surface font-bold border-0 shadow-[0_18px_50px_-12px_rgba(255,255,255,0.3)] h-12 px-8 text-sm"
              >
                Get in touch
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-5xl mt-16 text-center">
        <p className="inline-flex items-center gap-2 text-label font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-status-info-ink" />
          More about what we&apos;re shipping next on{" "}
          <Link href="/blogs" className="text-status-info-ink hover:underline">
            the blog
          </Link>
        </p>
      </section>
    </PublicShell>
  );
}
