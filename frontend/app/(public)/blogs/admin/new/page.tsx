import type { Metadata } from "next";
import { BlogPostForm } from "@/components/blog/blog-post-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New post</h1>
      <BlogPostForm mode="create" categories={[]} />
    </div>
  );
}
