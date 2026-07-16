import Image from "next/image";
import { resolveImageUrl } from "@/lib/utils";
import { formatBlogDate } from "@/lib/blog-utils";
import type { BlogAuthor } from "@/types/blog";
import { TruncatedText } from "@/components/ui/truncated-text";

interface AuthorCardProps {
  author: Pick<BlogAuthor, "name" | "avatar" | "role"> | null;
  date?: Date | string | null;
  readingTime?: number | null;
  avatarSize?: number;
  className?: string;
}

export function AuthorCard({
  author,
  date,
  readingTime,
  avatarSize = 32,
  className,
}: AuthorCardProps) {
  const avatar = resolveImageUrl(author?.avatar ?? undefined);

  return (
    <div className={`flex items-center gap-2.5 text-sm ${className ?? ""}`}>
      {avatar ? (
        <Image
          src={avatar}
          alt={author?.name ?? "Author"}
          width={avatarSize}
          height={avatarSize}
          unoptimized
          className="rounded-full object-cover"
        />
      ) : (
        <span
          className="flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
          style={{ width: avatarSize, height: avatarSize }}
        >
          {author?.name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
      <div className="flex min-w-0 flex-col leading-tight">
        <TruncatedText text={author?.name ?? "Unknown"} className="font-medium text-foreground" />
        {(date || readingTime) && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {date && <time dateTime={new Date(date).toISOString()}>{formatBlogDate(date)}</time>}
            {date && readingTime ? <span aria-hidden>·</span> : null}
            {readingTime ? <span>{readingTime} min read</span> : null}
          </span>
        )}
      </div>
    </div>
  );
}
