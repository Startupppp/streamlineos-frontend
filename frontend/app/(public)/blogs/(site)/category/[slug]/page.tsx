import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BlogHeader } from "@/components/blog/blog-header";
import { PostFeed } from "@/components/blog/post-feed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} articles`,
    alternates: { canonical: `/blogs/category/${slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
        <span className="font-medium text-foreground">{slug}</span>
      </nav>

      <BlogHeader title={slug} />

      <div className="mt-12">
        <PostFeed
          initialPosts={[]}
          initialCursor={null}
          initialHasMore={false}
          category={slug}
          emptyMessage="No articles in this category yet."
        />
      </div>
    </div>
  );
}
