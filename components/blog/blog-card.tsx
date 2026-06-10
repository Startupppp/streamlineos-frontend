import Image from "next/image";
import Link from "next/link";
import { resolveImageUrl } from "@/lib/utils";
import { formatBlogDate } from "@/lib/blog-utils";
import { CategoryBadge } from "./category-badge";
import type { BlogPostWithRelations } from "@/types/blog";

interface BlogCardProps {
  post: BlogPostWithRelations;
}

export function BlogCard({ post }: BlogCardProps) {
  const cover = resolveImageUrl(post.coverImage);
  const avatar = resolveImageUrl(post.author?.avatar ?? undefined);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-medium">
      <Link href={`/blogs/${post.slug}`} prefetch className="relative block aspect-[16/9] overflow-hidden bg-muted">
        {cover && (
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {post.category && (
          <CategoryBadge
            name={post.category.name}
            slug={post.category.slug}
            color={post.category.color}
          />
        )}

        <h3 className="text-lg font-semibold leading-snug tracking-tight">
          <Link
            href={`/blogs/${post.slug}`}
            prefetch
            className="line-clamp-2 decoration-2 underline-offset-2 group-hover:underline"
          >
            {post.title}
          </Link>
        </h3>

        <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>

        <div className="mt-1 flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {avatar ? (
            <Image
              src={avatar}
              alt={post.author?.name ?? "Author"}
              width={28}
              height={28}
              unoptimized
              className="rounded-full object-cover"
            />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
              {post.author?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <span className="font-medium text-foreground">{post.author?.name ?? "Unknown"}</span>
          {post.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={new Date(post.publishedAt).toISOString()}>
                {formatBlogDate(post.publishedAt)}
              </time>
            </>
          )}
          {post.readingTime ? (
            <>
              <span aria-hidden>·</span>
              <span>{post.readingTime} min</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
