import Image from "next/image";
import Link from "next/link";
import { resolveImageUrl } from "@/lib/utils";
import { CategoryBadge } from "./category-badge";
import { AuthorCard } from "./author-card";
import type { BlogPostWithRelations } from "@/types/blog";

interface FeaturedPostProps {
  post: BlogPostWithRelations;
}

export function FeaturedPost({ post }: FeaturedPostProps) {
  const cover = resolveImageUrl(post.coverImage);

  return (
    <article className="group grid overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-medium md:grid-cols-2">
      <Link
        href={`/blogs/${post.slug}`}
        prefetch
        className="relative block aspect-[16/10] overflow-hidden bg-muted md:aspect-auto"
      >
        {cover && (
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </Link>

      <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Featured
          </span>
          {post.category && (
            <CategoryBadge
              name={post.category.name}
              slug={post.category.slug}
              color={post.category.color}
            />
          )}
        </div>

        <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
          <Link
            href={`/blogs/${post.slug}`}
            prefetch
            className="decoration-2 underline-offset-4 group-hover:underline"
          >
            {post.title}
          </Link>
        </h2>

        <p className="line-clamp-3 text-muted-foreground md:text-lg">{post.excerpt}</p>

        <AuthorCard
          author={post.author}
          date={post.publishedAt}
          readingTime={post.readingTime}
          avatarSize={40}
          className="mt-2"
        />
      </div>
    </article>
  );
}
