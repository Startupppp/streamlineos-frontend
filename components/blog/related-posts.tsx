import { BlogCard } from "./blog-card";
import type { BlogPostWithRelations } from "@/types/blog";

interface RelatedPostsProps {
  posts: BlogPostWithRelations[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="related-heading">
      <h2 id="related-heading" className="mb-6 text-2xl font-bold tracking-tight">
        Related articles
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
