import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { BlogHeader } from "@/components/blog/blog-header";
import { CategoryFilter } from "@/components/blog/category-filter";
import { PostFeed } from "@/components/blog/post-feed";
import { getCategories, getCategoryBySlug, getPublishedPosts } from "@/server/queries/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: `${category.name} articles`,
    description: category.description ?? `Articles in ${category.name}.`,
    alternates: { canonical: `/blogs/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [categories, feed] = await Promise.all([
    getCategories(),
    getPublishedPosts({ categorySlug: slug, limit: 9 }),
  ]);

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
        <span className="font-medium text-foreground">{category.name}</span>
      </nav>

      <BlogHeader
        title={category.name}
        subtitle={category.description ?? undefined}
      />

      <div className="mt-8 flex justify-center">
        <CategoryFilter categories={categories} activeSlug={category.slug} />
      </div>

      <div className="mt-12">
        <PostFeed
          initialPosts={feed.posts}
          initialCursor={feed.nextCursor}
          initialHasMore={feed.hasMore}
          category={category.slug}
          emptyMessage="No articles in this category yet."
        />
      </div>
    </div>
  );
}
