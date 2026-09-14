import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts } from "@/features/blog/data/posts";
import { BRAND_NAME, BRAND_URL } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postSlug: string }>;
}): Promise<Metadata> {
  const { postSlug } = await params;
  const post = getPostBySlug(postSlug);
  if (!post) {
    return { title: "Post not found" };
  }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blogs/${post.slug}` },
    openGraph: {
      type: "article",
      url: `${BRAND_URL}/blogs/${post.slug}`,
      title: `${post.title} · ${BRAND_NAME} Blog`,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} · ${BRAND_NAME} Blog`,
      description: post.excerpt,
    },
  };
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ postSlug: post.slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ postSlug: string }>;
}) {
  const { postSlug } = await params;
  const post = getPostBySlug(postSlug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-muted-foreground">Blog post content unavailable.</p>
    </div>
  );
}
