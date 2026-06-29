import type { Metadata } from "next";
import { BlogPostForm } from "@/components/blog/blog-post-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit post</h1>
      <BlogPostForm mode="edit" postId={id} categories={[]} />
    </div>
  );
}
