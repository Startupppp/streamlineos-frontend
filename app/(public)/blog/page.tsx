import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell, MarketingEyebrow } from "@/features/marketing/marketing-shell";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Blog — ${BRAND_NAME}`,
  description: `Product updates, engineering notes, and operating playbooks from the ${BRAND_NAME} team.`,
};

const upcoming = [
  {
    tag: "Engineering",
    title: "Building the one-data-model platform: how we kept HR, CRM, and Projects on one schema",
    excerpt:
      "A walkthrough of the design choices that let an employee record, a candidate, and an account owner share the same identity across modules.",
    date: "Coming soon",
  },
  {
    tag: "Product",
    title: "What we shipped this quarter",
    excerpt:
      "A summary of every feature, fix, and quiet improvement we shipped across HR, CRM, projects, and chat over the last 90 days.",
    date: "Coming soon",
  },
  {
    tag: "Operating",
    title: "How small teams run weekly business reviews in one workspace",
    excerpt:
      "A field guide adapted from the founder-led companies running their Monday reviews entirely inside StreamlineOS.",
    date: "Coming soon",
  },
];

export default function BlogPage() {
  return (
    <MarketingShell>
      <section className="container mx-auto px-4 lg:px-8 max-w-4xl text-center">
        <MarketingEyebrow>The blog</MarketingEyebrow>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.02] text-slate-900 mb-5">
          Field notes from a team{" "}
          <span className="brand-text">building one OS.</span>
        </h1>
        <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
          Product updates, engineering deep-dives, and operating playbooks from teams running on
          {" "}
          {BRAND_NAME}. We publish less often than we&apos;d like — but only when there&apos;s
          something worth saying.
        </p>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-3xl mt-12">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-sm p-7 lg:p-9 shadow-[0_18px_44px_-18px_rgba(30,64,175,0.15)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-7">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0 shadow-[0_10px_28px_-10px_rgba(59,130,246,0.5)]">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1.5">
                The first issue is on the way.
              </h2>
              <p className="text-slate-600 text-[15px] leading-relaxed">
                We&apos;re drafting the inaugural posts now. Subscribe to get them when they
                land — no marketing fluff, just real updates.
              </p>
            </div>
          </div>

          <form
            action="/contact"
            className="mt-7 flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Bell className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                name="subscribe"
                placeholder="you@company.com"
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <Button
              type="submit"
              className="h-11 px-5 font-semibold"
            >
              Notify me
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 mt-3">
            One email per release. Unsubscribe in one click.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-4xl mt-20 lg:mt-24">
        <div className="text-center mb-10">
          <MarketingEyebrow>In the pipeline</MarketingEyebrow>
          <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-[-0.02em] text-slate-900">
            Drafts we&apos;re shipping next.
          </h2>
        </div>
        <div className="space-y-3.5">
          {upcoming.map((post) => (
            <article
              key={post.title}
              className="group rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-6 lg:p-7 hover:border-blue-300/60 hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700">
                  {post.tag}
                </span>
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400">
                  {post.date}
                </span>
              </div>
              <h3 className="font-display text-xl lg:text-2xl font-bold text-slate-900 leading-tight mb-2">
                {post.title}
              </h3>
              <p className="text-[14px] text-slate-600 leading-relaxed">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-3xl mt-16 text-center">
        <p className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.18em] text-slate-400">
          <Sparkles className="h-3 w-3 text-blue-500" />
          Want to write for us?{" "}
          <Link href="/contact" className="text-blue-600 hover:underline">
            Pitch a piece
          </Link>
        </p>
      </section>
    </MarketingShell>
  );
}
