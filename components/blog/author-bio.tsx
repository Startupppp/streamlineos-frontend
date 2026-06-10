import Image from "next/image";
import { Twitter, Linkedin } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import type { BlogAuthor } from "@/types/blog";

interface AuthorBioProps {
  author: BlogAuthor | null;
}

export function AuthorBio({ author }: AuthorBioProps) {
  if (!author) return null;
  const avatar = resolveImageUrl(author.avatar ?? undefined);
  const twitterUrl = author.twitter
    ? `https://twitter.com/${author.twitter.replace(/^@/, "")}`
    : null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-6 sm:flex-row sm:items-start">
      {avatar ? (
        <Image
          src={avatar}
          alt={author.name}
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
          {author.name[0]?.toUpperCase()}
        </span>
      )}

      <div className="flex-1">
        <p className="text-base font-semibold">{author.name}</p>
        {author.role && <p className="text-sm text-primary">{author.role}</p>}
        {author.bio && <p className="mt-2 text-sm text-muted-foreground">{author.bio}</p>}

        {(twitterUrl || author.linkedin) && (
          <div className="mt-3 flex items-center gap-3">
            {twitterUrl && (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on X`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Twitter className="size-4" />
              </a>
            )}
            {author.linkedin && (
              <a
                href={author.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on LinkedIn`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Linkedin className="size-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
