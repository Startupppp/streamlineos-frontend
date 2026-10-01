import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/features/blog/post-card";
import { getCategories, searchPosts } from "@/lib/blog/api";
import { JOURNAL_NAME, blogUrl } from "@/lib/blog/seo";

export const dynamic = "force-dynamic";

/** Internal search results are never indexed; their links are still followed. */
export const metadata: Metadata = {
  title: { absolute: `Search · ${JOURNAL_NAME}` },
  description: "Search every published story in the journal by title, summary or text.",
  robots: { index: false, follow: true },
  alternates: { canonical: blogUrl("/search") },
};

const MAX_QUERY = 200;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, MAX_QUERY) ?? "";
  const [results, categories] = await Promise.all([q ? searchPosts(q) : Promise.resolve([]), getCategories()]);
  const topics = categories.filter((c) => c.count > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-journal text-4xl text-journal-ink sm:text-5xl">Search the journal</h1>
      <form role="search" action="/blogs/search" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <label htmlFor="journal-search" className="sr-only">Search stories</label>
        <input id="journal-search" name="q" type="search" defaultValue={q} maxLength={MAX_QUERY} placeholder="Try “onboarding” or “weekly review”"
          className="min-h-12 flex-1 rounded-full border border-journal-rule bg-journal-surface px-5 text-journal-ink placeholder:text-journal-muted" />
        <button type="submit" className="min-h-12 rounded-full bg-journal-ink px-6 text-journal-paper">Search</button>
      </form>

      <div aria-live="polite" className="mt-12">
        {!q ? (
          <p className="text-journal-muted">Search titles, summaries and the full text of every published story.</p>
        ) : results.length === 0 ? (
          <div>
            <p className="text-journal-ink">No stories match “{q}”.</p>
            <p className="mt-2 text-journal-muted">Try fewer or different words, or start from a topic.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-journal-muted">{results.length === 20 ? "Top 20 results" : `${results.length} ${results.length === 1 ? "result" : "results"}`} for “{q}”</p>
            <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p) => <PostCard key={p.id} post={p} headingLevel={2} />)}
            </div>
          </>
        )}
      </div>

      {(!q || results.length === 0) && topics.length ? (
        <nav aria-label="Topics" className="mt-12">
          <h2 className="font-journal text-2xl text-journal-ink">Browse by topic</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {topics.map((c) => (
              <li key={c.slug}><Link href={`/blogs/category/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-journal-rule px-4 text-journal-ink hover:bg-journal-sage">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
