import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostForm } from "@/components/blog/blog-post-form";
import { getAdminPostById, getCategories } from "@/server/queries/blog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    getAdminPostById(id),
    getCategories(),
  ]);
  if (!post) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit post</h1>
      <BlogPostForm
        mode="edit"
        postId={id}
        initial={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          contentJson: (post.contentJson as Record<string, unknown> | null) ?? null,
          coverImage: post.coverImage,
          categoryId: post.categoryId,
          status: post.status,
          isFeatured: post.isFeatured,
          tags: post.tags,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
