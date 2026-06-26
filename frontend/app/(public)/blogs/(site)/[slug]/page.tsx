import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BlogContent } from "@/components/blog/blog-content";
import { CategoryBadge } from "@/components/blog/category-badge";
import { AuthorCard } from "@/components/blog/author-card";
import { ShareButtons } from "@/components/blog/share-buttons";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { RelatedPosts } from "@/components/blog/related-posts";
import { PostNavigation } from "@/components/blog/post-navigation";
import {
  getPostBySlug,
  getRelatedPosts,
  getAdjacentPosts,
} from "@/server/queries/blog";
import { extractToc, formatBlogDate } from "@/lib/blog-utils";
import { resolveImageUrl } from "@/lib/utils";
import { BRAND_NAME, BRAND_URL } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;
  const cover = resolveImageUrl(post.coverImage);

  return {
    title,
    description,
    alternates: { canonical: `/blogs/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blogs/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      authors: post.author?.name ? [post.author.name] : undefined,
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { html, toc } = extractToc(post.content);
  const [related, adjacent] = await Promise.all([
    getRelatedPosts({ postId: post.id, categoryId: post.categoryId, limit: 3 }),
    getAdjacentPosts(post.publishedAt),
  ]);

  const cover = resolveImageUrl(post.coverImage);
  const postUrl = `/blogs/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: cover ? [cover] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: post.author?.name
      ? { "@type": "Person", name: post.author.name }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: BRAND_URL,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BRAND_URL}${postUrl}` },
  };

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Blog
        </Link>

        <header className="mx-auto mt-6 max-w-3xl text-center">
          {post.category && (
            <div className="flex justify-center">
              <CategoryBadge
                name={post.category.name}
                slug={post.category.slug}
                color={post.category.color}
              />
            </div>
          )}
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{post.title}</h1>
          <p className="mt-4 text-xl text-muted-foreground">{post.excerpt}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <AuthorCard
              author={post.author}
              date={post.publishedAt}
              readingTime={post.readingTime}
              avatarSize={40}
            />
          </div>
        </header>

        {cover && (
          <div className="relative mx-auto mt-10 aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-muted shadow-soft">
            <Image
              src={cover}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        )}

        <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12">
          <div className="mx-auto w-full max-w-3xl">
            <BlogContent html={html} />

            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blogs/tag/${encodeURIComponent(tag)}`}
                    className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-y border-border py-4">
              <span className="text-sm text-muted-foreground">
                {post.publishedAt && formatBlogDate(post.publishedAt)}
              </span>
              <ShareButtons title={post.title} url={postUrl} />
            </div>
          </div>

          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TableOfContents items={toc} />
              </div>
            </aside>
          )}
        </div>

        <div className="mx-auto mt-16 max-w-5xl space-y-16">
          <PostNavigation prev={adjacent.prev} next={adjacent.next} />
          <RelatedPosts posts={related} />
        </div>
      </article>
    </>
  );
}
