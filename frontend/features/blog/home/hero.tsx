import Link from "next/link";
import type { BlogCard } from "@/lib/blog/contracts";
import { CoverImage } from "../cover-image";

/**
 * Split hero: headline and promise on one side, the featured story in an arched frame on the
 * other, with a compact card overlapping the frame on wide screens and flowing below it on small
 * ones. With no published story there is no image and no invented card.
 */
export function JournalHero({ featured }: { featured: BlogCard | null }) {
  return (
    <section aria-labelledby="journal-hero-title" className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-2 md:pt-20">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">Practical guides</p>
        <h1 id="journal-hero-title" className="mt-4 font-journal text-5xl leading-tight text-journal-ink sm:text-6xl">
          Clearer work.<br />Stronger teams.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-journal-muted">
          Practical guides for the people, projects, and processes that keep your business moving.
        </p>
        <Link href="#latest" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-journal-ink px-6 text-journal-paper hover:opacity-90">
          Explore the journal
        </Link>
      </div>
      {featured ? (
        <div className="relative">
          <Link href={`/blogs/${featured.slug}`} tabIndex={-1} aria-hidden className="block">
            <CoverImage post={featured} priority sizes="(max-width: 768px) 100vw, 600px" className="aspect-[4/5] rounded-t-full" />
          </Link>
          <article className="relative mt-4 rounded-sm border border-journal-rule bg-journal-surface p-5 md:absolute md:-bottom-8 md:-left-10 md:mt-0 md:max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">Featured{featured.category ? ` · ${featured.category.name}` : ""}</p>
            <h2 className="mt-2 font-journal text-xl leading-snug text-journal-ink">
              <Link href={`/blogs/${featured.slug}`} className="hover:underline">{featured.title}</Link>
            </h2>
            <p className="mt-2 text-sm text-journal-muted">{featured.readingTime} min read</p>
          </article>
        </div>
      ) : (
        <div aria-hidden className="aspect-[4/5] rounded-t-full bg-journal-sage" />
      )}
    </section>
  );
}
