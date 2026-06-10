import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { MarketingShell, MarketingEyebrow } from "@/features/marketing/marketing-shell";
import { BRAND_NAME } from "@/lib/branding";
import { getAllPosts } from "@/features/blog/data/posts";

export const metadata: Metadata = {
  title: `Blog — ${BRAND_NAME}`,
  description: `Product updates, engineering notes, and operating playbooks from the ${BRAND_NAME} team.`,
  alternates: { canonical: "/blog" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlogPage() {
  const allPosts = getAllPosts();

  return (
    <MarketingShell>
      <section className="container mx-auto px-4 lg:px-8 max-w-4xl text-center">
        <MarketingEyebrow>The blog</MarketingEyebrow>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.02] text-slate-900 mb-5">
          Field notes from a team{" "}
          <span className="brand-text">building one OS.</span>
        </h1>
        <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
          Product updates, engineering deep-dives, and operating playbooks from teams running on{" "}
          {BRAND_NAME}. We publish less often than we&apos;d like — but only when there&apos;s
          something worth saying.
        </p>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-3xl mt-14 lg:mt-16">
        <div className="space-y-4">
          {allPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-6 lg:p-7 hover:border-blue-300/60 hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700">
                  {post.tag}
                </span>
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400">
                  {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                </span>
              </div>
              <h2 className="font-display text-xl lg:text-2xl font-bold text-slate-900 leading-tight mb-2 group-hover:text-blue-700 transition-colors">
                {post.title}
              </h2>
              <p className="text-[14px] text-slate-600 leading-relaxed mb-4">{post.excerpt}</p>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600">
                Read post
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-3xl mt-16">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-sm p-7 lg:p-9 shadow-[0_18px_44px_-18px_rgba(30,64,175,0.15)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-7">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0 shadow-[0_10px_28px_-10px_rgba(59,130,246,0.5)]">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1.5">
                Get new posts in your inbox.
              </h2>
              <p className="text-slate-600 text-[15px] leading-relaxed">
                One email per release. No marketing fluff, no daily digests. Unsubscribe in one click.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Subscribe via contact form
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-3xl mt-12 text-center">
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
