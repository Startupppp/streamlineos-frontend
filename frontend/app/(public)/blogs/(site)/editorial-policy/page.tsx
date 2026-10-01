import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import { JOURNAL_NAME, blogUrl } from "@/lib/blog/seo";

export const metadata: Metadata = {
  title: { absolute: `Editorial policy and corrections · ${JOURNAL_NAME}` },
  description: `How the ${BRAND_NAME} Journal is written, checked and corrected.`,
  alternates: { canonical: blogUrl("/editorial-policy") },
};

export default function EditorialPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">Editorial policy</p>
      <h1 className="mt-3 font-journal text-4xl text-journal-ink sm:text-5xl">How we write, check and correct</h1>
      <div className="journal-article mt-10">
        <p>The {BRAND_NAME} Journal publishes practical guides for people who run teams: onboarding, project reviews, customer handoffs, collaboration and the operations around them. This page explains who writes it, how it relates to our product, and what happens when we get something wrong.</p>
        <h2 id="authorship">Authorship</h2>
        <p>Every story names the person accountable for it. Author pages list their role and background. We do not publish stories generated automatically, and we do not use invented people, quotes or testimonials.</p>
        <h2 id="product">Our product</h2>
        <p>We make {BRAND_NAME}, and some stories mention it. When they do, we say so plainly and describe only what the product does today. Guides are written to be useful whatever tools you use.</p>
        <h2 id="sources">Sources and claims</h2>
        <p>Where a story relies on research, law or data, it links to the source. We avoid promises about outcomes we cannot know, such as guaranteed productivity or compliance. Legal and financial topics are general information, not advice for your situation.</p>
        <h2 id="images">Images</h2>
        <p>We use original diagrams, product screenshots with invented sample data, or licensed photography, and credit the source. We never show real employee or customer records.</p>
        <h2 id="updates">Updates</h2>
        <p>When we change a story in a way that matters to readers, the page shows the date it was updated alongside the date it was first published.</p>
        <h2 id="corrections">Corrections</h2>
        <p>If you find an error, tell us through the <Link href="/contact">contact page</Link> or at <a href={`mailto:${BRAND_SUPPORT_EMAIL}`}>{BRAND_SUPPORT_EMAIL}</a>, with the story’s address and what is wrong. We review every report, fix confirmed errors promptly, and note significant corrections on the story.</p>
      </div>
    </article>
  );
}
