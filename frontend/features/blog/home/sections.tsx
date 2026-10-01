import Link from "next/link";
import type { BlogCard, BlogCategorySummary } from "@/lib/blog/contracts";
import { BRAND_NAME } from "@/lib/branding";
import { CoverImage } from "../cover-image";
import { PostCard } from "../post-card";

export function LatestStories({ posts }: { posts: BlogCard[] }) {
  return (
    <section id="latest" aria-labelledby="latest-title" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-16 sm:px-6">
      <div className="flex items-end justify-between gap-4 border-b border-journal-rule pb-4">
        <h2 id="latest-title" className="font-journal text-3xl text-journal-ink">Latest stories</h2>
        <Link href="/blogs/archive" className="text-sm text-journal-ink underline-offset-4 hover:underline">All stories →</Link>
      </div>
      {posts.length === 0 ? (
        <p className="py-16 text-center text-journal-muted">The first stories are being written. Check back soon.</p>
      ) : (
        <div className={`mt-10 grid gap-x-8 gap-y-14 ${posts.length === 1 ? "max-w-md" : posts.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </section>
  );
}

export function Topics({ categories }: { categories: BlogCategorySummary[] }) {
  const populated = categories.filter((c) => c.count > 0);
  if (populated.length === 0) return null;
  return (
    <section id="topics" aria-labelledby="topics-title" className="scroll-mt-8 border-y border-journal-rule bg-journal-sage">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 id="topics-title" className="font-journal text-3xl text-journal-ink">Explore by topic</h2>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-sm border border-journal-rule bg-journal-rule sm:grid-cols-2 lg:grid-cols-3">
          {populated.map((c) => (
            <li key={c.slug} className="bg-journal-paper">
              <Link href={`/blogs/category/${c.slug}`} className="flex h-full flex-col p-6 hover:bg-journal-surface">
                <span className="font-journal text-xl text-journal-ink">{c.name}</span>
                {c.description ? <span className="mt-2 line-clamp-2 text-sm text-journal-muted">{c.description}</span> : null}
                <span className="mt-4 text-xs uppercase tracking-widest text-journal-accent-ink">{c.count} {c.count === 1 ? "story" : "stories"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** One practical guide given more room than a card: image and text side by side. */
export function EditorialFeature({ post }: { post: BlogCard }) {
  return (
    <section aria-labelledby="feature-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="grid items-center gap-10 rounded-sm bg-journal-ink p-6 text-journal-paper sm:p-10 md:grid-cols-2">
        <CoverImage post={post} sizes="(max-width: 768px) 100vw, 560px" className="aspect-[4/3] rounded-sm" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-journal-sage">Practical guide{post.category ? ` · ${post.category.name}` : ""}</p>
          <h2 id="feature-title" className="mt-3 font-journal text-4xl leading-tight">
            <Link href={`/blogs/${post.slug}`} className="underline-offset-4 hover:underline">{post.title}</Link>
          </h2>
          <p className="mt-4 text-journal-sage">{post.excerpt}</p>
          <Link href={`/blogs/${post.slug}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-journal-paper px-5 text-journal-ink">Read the guide</Link>
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  const points = [
    { title: "Named, accountable authors", body: "Every story carries the name of the person responsible for it, with their role and background." },
    { title: "Clear about our product", body: `We make ${BRAND_NAME}. When a guide mentions it, we say so plainly and only describe what it actually does today.` },
    { title: "Sources checked", body: "Claims about law, data or research link to their source. We avoid promises about results we cannot know." },
    { title: "Corrections in the open", body: "When we get something wrong, we fix it and note the change. Tell us through our contact page." },
  ];
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 md:grid-cols-3">
        <div>
          <h2 id="trust-title" className="font-journal text-3xl text-journal-ink">How we write</h2>
          <p className="mt-3 text-journal-muted">Useful first, product second.</p>
          <Link href="/blogs/editorial-policy" className="mt-5 inline-block text-journal-ink underline underline-offset-4">Read our editorial policy</Link>
        </div>
        <ul className="grid gap-8 sm:grid-cols-2 md:col-span-2">
          {points.map((p) => (
            <li key={p.title} className="border-t border-journal-rule pt-4">
              <h3 className="font-semibold text-journal-ink">{p.title}</h3>
              <p className="mt-2 text-sm text-journal-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ProductCta() {
  return (
    <section aria-labelledby="product-cta-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-6 border-y border-journal-rule py-10 md:flex-row md:items-center">
        <div>
          <h2 id="product-cta-title" className="font-journal text-2xl text-journal-ink">Run people, projects and customers in one place</h2>
          <p className="mt-2 text-journal-muted">{BRAND_NAME} brings HR, projects, CRM, chat and analytics onto one foundation.</p>
        </div>
        <Link href="/pricing" data-cta-placement="journal-home" className="inline-flex min-h-11 items-center rounded-full border border-journal-ink px-5 text-journal-ink hover:bg-journal-ink hover:text-journal-paper">
          See plans and pricing
        </Link>
      </div>
    </section>
  );
}
