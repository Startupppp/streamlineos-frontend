import type { BlogCard } from "@/lib/blog/contracts";
import { resolveImageUrl } from "@/lib/utils";

interface Props {
  post: Pick<BlogCard, "cover" | "coverImage" | "title">;
  sizes: string;
  /** Only the one image that is the page's largest contentful paint. */
  priority?: boolean;
  className?: string;
}

/**
 * A responsive cover: WebP sources with a JPEG fallback, intrinsic width/height so the layout is
 * reserved before the bytes arrive, lazy below the fold. If the image fails or is missing, the
 * reserved box keeps its shape on the sage ground and the alt text stands in.
 */
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
