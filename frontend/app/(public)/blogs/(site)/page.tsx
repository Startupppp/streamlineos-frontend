import type { Metadata } from "next";

import { BlogHeader } from "@/components/blog/blog-header";
import { BlogSearch } from "@/components/blog/blog-search";
import { CategoryFilter } from "@/components/blog/category-filter";
import { PostFeed } from "@/components/blog/post-feed";
import { NewsletterCTA } from "@/components/blog/newsletter-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles on product, design, engineering, and company building from the StreamlineOS team.",
  alternates: { canonical: "/blogs" },
  openGraph: {
    title: "Blog",
    description:
      "Articles on product, design, engineering, and company building from the StreamlineOS team.",
    type: "website",
    url: "/blogs",
  },
};

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <BlogHeader
        eyebrow="Insights"
        title="The StreamlineOS Blog"
        subtitle="Ideas on product, design, engineering, and building modern teams."
      />

      <div className="mt-8 flex flex-col items-center gap-4">
        <BlogSearch />
        <CategoryFilter categories={[]} activeSlug={null} />
      </div>

      <div className="mt-12">
        {search && (
          <p className="mb-6 text-sm text-muted-foreground">
            Results for <span className="font-medium text-foreground">"{search}"</span>
          </p>
        )}
        <PostFeed
          initialPosts={[]}
          initialCursor={null}
          initialHasMore={false}
          search={search}
          emptyMessage={
            search ? "No articles match your search." : "No articles published yet."
          }
        />
      </div>

      <div className="mt-16">
        <NewsletterCTA />
      </div>
    </div>
  );
}
