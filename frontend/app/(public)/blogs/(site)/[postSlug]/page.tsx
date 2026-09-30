import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArticleCta, AuthorBox, RelatedStories } from "@/features/blog/article/article-parts";
import { ArticleJsonLd } from "@/features/blog/article/article-json-ld";
import { CopyLink } from "@/features/blog/article/copy-link";
import { TableOfContents } from "@/features/blog/article/table-of-contents";
import { CoverImage } from "@/features/blog/cover-image";
import { formatJournalDate, isMeaningfulUpdate } from "@/features/blog/format";
import { getArticle, getRelated, resolveBlogRedirect } from "@/lib/blog/api";
import { sanitizeArticleHtml } from "@/lib/blog/sanitize";
import { JOURNAL_NAME, blogUrl } from "@/lib/blog/seo";
import { tableOfContents } from "@/lib/blog/toc";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ postSlug: string }> };

/** Long enough to earn a table of contents. */
const TOC_MIN_HEADINGS = 3;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { postSlug } = await params;
  const article = await getArticle(postSlug);
  if (!article) return { title: "Story not found", robots: { index: false } };
  const url = blogUrl(`/${article.slug}`);
  const description = article.metaDescription ?? article.excerpt;
  const image = article.socialImage ?? article.cover?.src;
  return {
    title: { absolute: `${article.metaTitle ?? article.title} · ${JOURNAL_NAME}` },
    description,
    alternates: { canonical: url },
    authors: article.author ? [{ name: article.author.name, url: blogUrl(`/author/${article.author.slug}`) }] : undefined,
    openGraph: {
      type: "article",
      url,
      title: article.metaTitle ?? article.title,
      description,
      siteName: JOURNAL_NAME,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.modifiedAt ?? undefined,
      section: article.category?.name,
      tags: article.tags,
      images: image ? [{ url: image, width: 1200, height: 630, alt: article.cover?.alt ?? "" }] : undefined,
    },
    twitter: { card: "summary_large_image", title: article.metaTitle ?? article.title, description, images: image ? [image] : undefined },
    // Lets the blog admin confirm this exact published revision is live.
    other: { "streamline:revision": article.revisionId },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { postSlug } = await params;
  const article = await getArticle(postSlug);
  if (!article) {
    const redirect = await resolveBlogRedirect(`/blogs/${postSlug}`);
    if (redirect?.statusCode === 301 && redirect.targetPath) permanentRedirect(redirect.targetPath);
    notFound();
  }
  const related = await getRelated(article.slug);
  const html = sanitizeArticleHtml(article.contentHtml);
  const toc = tableOfContents(html);
  const showToc = toc.length >= TOC_MIN_HEADINGS;
  const url = blogUrl(`/${article.slug}`);

  return (
    <>
      <ArticleJsonLd article={article} />
      <article className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-journal-muted">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/blogs" className="hover:text-journal-ink">Journal</Link></li>
            {article.category ? (
              <li className="flex gap-2"><span aria-hidden>/</span><Link href={`/blogs/category/${article.category.slug}`} className="hover:text-journal-ink">{article.category.name}</Link></li>
            ) : null}
          </ol>
        </nav>

        <header className="mx-auto mt-10 max-w-3xl text-center">
          {article.category ? <p className="text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">{article.category.name}</p> : null}
          <h1 className="mt-4 break-words font-journal text-4xl leading-tight text-journal-ink sm:text-5xl">{article.title}</h1>
          {article.standfirst ? <p className="mt-5 font-journal text-xl text-journal-muted">{article.standfirst}</p> : null}
          <p className="mt-6 text-sm text-journal-muted">
            {article.author ? <>By <Link href={`/blogs/author/${article.author.slug}`} className="text-journal-ink underline-offset-4 hover:underline">{article.author.name}</Link><span aria-hidden> · </span></> : null}
            {article.publishedAt ? <time dateTime={article.publishedAt}>{formatJournalDate(article.publishedAt)}</time> : null}
            {isMeaningfulUpdate(article.publishedAt, article.modifiedAt) && article.modifiedAt ? (
              <><span aria-hidden> · </span>Updated <time dateTime={article.modifiedAt}>{formatJournalDate(article.modifiedAt)}</time></>
            ) : null}
            <span aria-hidden> · </span>{article.readingTime} min read
          </p>
        </header>

        <figure className="mx-auto mt-10 max-w-5xl">
          <CoverImage post={article} priority sizes="(max-width: 1024px) 100vw, 1024px" className="aspect-[16/9] rounded-sm" />
          {article.cover?.caption || article.cover?.credit ? (
            <figcaption className="mt-3 text-sm text-journal-muted">
              {article.cover.caption}
              {article.cover.caption && article.cover.credit ? " " : ""}
              {article.cover.credit ? <span>Image: {article.cover.credit}</span> : null}
            </figcaption>
          ) : null}
        </figure>

        <div className={`mx-auto mt-12 ${showToc ? "grid max-w-6xl gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]" : "max-w-3xl"}`}>
          {showToc ? <aside><TableOfContents entries={toc} variant="desktop" /></aside> : null}
          <div className="min-w-0">
            {showToc ? <div className="mb-8"><TableOfContents entries={toc} variant="mobile" /></div> : null}
            <div className="journal-article" dangerouslySetInnerHTML={{ __html: html }} />
            {article.tags.length ? (
              <ul aria-label="Tags" className="mt-10 flex flex-wrap gap-2">
                {article.tags.map((t) => (
                  <li key={t}><Link href={`/blogs/tag/${t}`} className="inline-flex min-h-11 items-center rounded-full border border-journal-rule px-4 text-sm text-journal-muted hover:text-journal-ink">#{t}</Link></li>
                ))}
              </ul>
            ) : null}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <CopyLink url={url} />
              <Link href="/blogs/editorial-policy#corrections" className="text-sm text-journal-muted underline underline-offset-4 hover:text-journal-ink">Spotted an error? Request a correction</Link>
            </div>
            {article.author ? <AuthorBox author={article.author} /> : null}
            <ArticleCta ctaKey={article.ctaKey} />
          </div>
        </div>
      </article>
      <RelatedStories posts={related} />
    </>
  );
}
