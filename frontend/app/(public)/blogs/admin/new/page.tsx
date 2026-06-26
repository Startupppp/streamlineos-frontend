import type { Metadata } from "next";
import { BlogPostForm } from "@/components/blog/blog-post-form";
import { getCategories } from "@/server/queries/blog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New post</h1>
      <BlogPostForm
        mode="create"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
