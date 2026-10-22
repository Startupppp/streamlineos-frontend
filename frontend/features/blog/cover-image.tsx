import type { BlogCard } from "@/lib/blog/contracts";
import { resolveImageUrl } from "@/lib/utils";

interface Props {
  post: Pick<BlogCard, "cover" | "coverImage" | "title">;
  sizes: string;
  priority?: boolean;
  className?: string;
}

export function CoverImage({ post, sizes, priority = false, className = "" }: Props) {
  const box = `relative block overflow-hidden bg-journal-sage ${className}`;
  const cover = post.cover;
  if (cover) {
    return (
      <picture className={box}>
        {cover.sources.length ? (
          <source type="image/webp" srcSet={cover.sources.map((s) => `${s.src} ${s.width}w`).join(", ")} sizes={sizes} />
        ) : null}
        <img
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </picture>
    );
  }
  const legacy = resolveImageUrl(post.coverImage);
  return (
    <span className={box}>
      {legacy ? <img src={legacy} alt="" loading={priority ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" /> : null}
    </span>
  );
}
