import Link from "next/link";
import type { BlogPostPage } from "@/lib/blog/contracts";
import { Pagination } from "./pagination";
import { PostCard } from "./post-card";

interface Props {
  eyebrow: string;
  title: string;
  intro?: string | null;
  basePath: string;
  page: BlogPostPage;
  crumbs: { href: string; label: string }[];
  empty: string;
  aside?: React.ReactNode;
}

/** A listing of published stories with a real, numbered, link-based pager. */
export function Listing({ eyebrow, title, intro, basePath, page, crumbs, empty, aside }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-journal-muted">
        <ol className="flex flex-wrap gap-2">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex gap-2">
              {i > 0 ? <span aria-hidden>/</span> : null}
              <Link href={c.href} className="hover:text-journal-ink">{c.label}</Link>
            </li>
          ))}
        </ol>
      </nav>
      <header className="mt-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">{eyebrow}</p>
        <h1 className="mt-3 break-words font-journal text-4xl text-journal-ink sm:text-5xl">{title}</h1>
        {intro ? <p className="mt-4 text-lg text-journal-muted">{intro}</p> : null}
        {page.page > 1 ? <p className="mt-2 text-sm text-journal-muted">Page {page.page} of {page.totalPages}</p> : null}
      </header>
      {aside}
      {page.posts.length === 0 ? (
        <div className="mt-16 border-t border-journal-rule py-16 text-center">
          <p className="text-journal-muted">{empty}</p>
          <Link href="/blogs/archive" className="mt-4 inline-block text-journal-ink underline underline-offset-4">Browse all stories</Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-x-8 gap-y-14 border-t border-journal-rule pt-12 sm:grid-cols-2 lg:grid-cols-3">
          {page.posts.map((p) => <PostCard key={p.id} post={p} headingLevel={2} />)}
        </div>
      )}
      <Pagination basePath={basePath} page={page.page} totalPages={page.totalPages} />
    </div>
  );
}
