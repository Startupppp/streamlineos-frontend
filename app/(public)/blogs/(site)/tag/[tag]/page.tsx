import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BlogHeader } from "@/components/blog/blog-header";
import { PostFeed } from "@/components/blog/post-feed";
import { getPublishedPosts } from "@/server/queries/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded}`,
    description: `Articles tagged “${decoded}”.`,
    alternates: { canonical: `/blogs/tag/${tag}` },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const feed = await getPublishedPosts({ tag: decoded, limit: 9 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex items-center justify-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/blogs" className="hover:text-foreground">
          Blog
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">#{decoded}</span>
      </nav>

      <BlogHeader title={`#${decoded}`} subtitle={`Articles tagged “${decoded}”.`} />

      <div className="mt-12">
        <PostFeed
          initialPosts={feed.posts}
          initialCursor={feed.nextCursor}
          initialHasMore={feed.hasMore}
          tag={decoded}
          emptyMessage="No articles with this tag yet."
        />
      </div>
    </div>
  );
}
