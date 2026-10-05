import Link from "next/link";
import type { BlogArticle, BlogCard } from "@/lib/blog/contracts";
import { blogCta } from "@/lib/blog/cta";
import { resolveImageUrl } from "@/lib/utils";
import { PostCard } from "../post-card";

export function AuthorBox({ author }: { author: NonNullable<BlogArticle["author"]> }) {
  return (
    <section aria-labelledby="author-box-title" className="mt-16 flex gap-5 border-y border-journal-rule py-8">
      {author.avatar ? <img src={resolveImageUrl(author.avatar)} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-full object-cover" /> : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">About the author</p>
        <h2 id="author-box-title" className="mt-1 font-journal text-xl text-journal-ink">
          <Link href={`/blogs/author/${author.slug}`} className="hover:underline">{author.name}</Link>
        </h2>
        {author.role ? <p className="text-sm text-journal-muted">{author.role}</p> : null}
        {author.bio ? <p className="mt-3 text-journal-muted">{author.bio}</p> : null}
        <p className="mt-3 flex flex-wrap gap-4 text-sm">
          {author.linkedin ? <a href={`https://www.linkedin.com/in/${encodeURIComponent(author.linkedin)}`} rel="noopener noreferrer" className="text-journal-ink underline underline-offset-4">LinkedIn</a> : null}
          {author.twitter ? <a href={`https://x.com/${encodeURIComponent(author.twitter)}`} rel="noopener noreferrer" className="text-journal-ink underline underline-offset-4">X</a> : null}
        </p>
      </div>
    </section>
  );
}

export function ArticleCta({ ctaKey }: { ctaKey: string | null }) {
  const cta = blogCta(ctaKey);
  return (
    <aside aria-label="From StreamlineOS" className="mt-12 rounded-sm bg-journal-sage p-6">
      <p className="text-journal-ink">{cta.blurb}</p>
      <Link href={cta.href} data-cta-placement="article-end" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-journal-ink px-5 text-journal-paper hover:opacity-90">
        {cta.label}
      </Link>
    </aside>
  );
}

export function RelatedStories({ posts }: { posts: BlogCard[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="related-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h2 id="related-title" className="border-b border-journal-rule pb-4 font-journal text-3xl text-journal-ink">Keep reading</h2>
      <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </section>
  );
}
