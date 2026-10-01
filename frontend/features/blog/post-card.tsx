import Link from "next/link";
import type { BlogCard } from "@/lib/blog/contracts";
import { CoverImage } from "./cover-image";
import { formatJournalDate } from "./format";

const CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px";

/** One story in a grid: category, title, excerpt, byline, date and reading time. */
export function PostCard({ post, headingLevel = 3 }: { post: BlogCard; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group flex flex-col">
      <Link href={`/blogs/${post.slug}`} tabIndex={-1} aria-hidden className="block">
        <CoverImage post={post} sizes={CARD_SIZES} className="aspect-[3/2] rounded-sm" />
      </Link>
      {post.category ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">
          <Link href={`/blogs/category/${post.category.slug}`} className="hover:underline">{post.category.name}</Link>
        </p>
      ) : null}
      <Heading className="mt-2 font-journal text-2xl leading-snug text-journal-ink">
        <Link href={`/blogs/${post.slug}`} className="decoration-journal-accent decoration-2 underline-offset-4 group-hover:underline">
          {post.title}
        </Link>
      </Heading>
      <p className="mt-2 line-clamp-3 text-journal-muted">{post.excerpt}</p>
      <p className="mt-3 text-sm text-journal-muted">
        {/* Underlined, not only a darker ink: inside a line of text, colour alone fails WCAG 1.4.1. */}
        {post.author ? <Link href={`/blogs/author/${post.author.slug}`} className="text-journal-ink underline underline-offset-4">{post.author.name}</Link> : null}
        {post.author && post.publishedAt ? <span aria-hidden> · </span> : null}
        {post.publishedAt ? <time dateTime={post.publishedAt}>{formatJournalDate(post.publishedAt)}</time> : null}
        <span aria-hidden> · </span>
        {post.readingTime} min read
      </p>
    </article>
  );
}
