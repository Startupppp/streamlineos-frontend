import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { extractToc, type TocItem } from "@/lib/blog-utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { PublicKbArticle, PublicOrgInfo } from "@/lib/public-fetch";
import { PublicArticleFeedback } from "./public-article-feedback";
import { PublicOrgHeader } from "./public-org-header";

const PROSE_CLASS =
  "prose prose-slate dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-img:rounded-lg prose-img:border prose-img:border-border";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "b", "i", "u", "s", "del", "ins", "mark", "sub", "sup",
    "blockquote",
    "ul", "ol", "li",
    "a",
    "code", "pre",
    "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "div", "span",
  ],
  allowedAttributes: {
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    col: ["span"],
    colgroup: ["span"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

interface ArticleTocProps {
  items: TocItem[];
}

function ArticleToc({ items }: ArticleTocProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Table of contents" className="hidden lg:block">
      <div className="sticky top-8 rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          On this page
        </p>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className={item.level === 3 ? "ml-3" : ""}>
              <a
                href={`#${item.id}`}
                className="text-label text-muted-foreground hover:text-foreground transition-colors line-clamp-2"
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

interface PublicArticleContentProps {
  article: PublicKbArticle;
  orgId: string;
  org: PublicOrgInfo | null;
}

export function PublicArticleContent({ article, orgId, org }: PublicArticleContentProps) {
  const { html: withIds, toc } = extractToc(article.content ?? "");
  const tocItems: TocItem[] = toc
    .filter((h) => h.level === 2 || h.level === 3)
    .map((h) => ({ id: h.id, text: h.text, level: h.level === 3 ? 3 : 2 }));
  const hasToc = tocItems.length > 0;

  return (
    <main className="min-h-dvh bg-background">
      {org && (
        <PublicOrgHeader
          orgName={org.name}
          orgLogo={org.logo}
          orgId={orgId}
        />
      )}
      <div
        className={cn(
          "mx-auto px-4 py-8 sm:py-12",
          hasToc ? "max-w-5xl" : "max-w-prose",
        )}
      >
        <Link
          href={`/help/${orgId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 -ml-1"
        >
          ← Back to help center
        </Link>

        <div
          className={cn(
            hasToc && "lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-10",
          )}
        >
          <div className="min-w-0 max-w-prose">
            <article>
              {article.categoryName && (
                <Badge variant="secondary" className="mb-3">
                  {article.categoryName}
                </Badge>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                {article.updatedAt && (
                  <time dateTime={article.updatedAt}>
                    Last updated {format(new Date(article.updatedAt), "MMM d, yyyy")}
                  </time>
                )}
                {!article.updatedAt && article.publishedAt && (
                  <time dateTime={article.publishedAt}>
                    Published {format(new Date(article.publishedAt), "MMM d, yyyy")}
                  </time>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {article.views} views
                </span>
              </div>

              {article.excerpt && (
                <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                  {article.excerpt}
                </p>
              )}

              <div
                className={cn("mt-6", PROSE_CLASS)}
                dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(withIds) }}
              />

              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-dense">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </article>

            <PublicArticleFeedback orgId={orgId} slug={article.slug} />
          </div>

          {hasToc && <ArticleToc items={tocItems} />}
        </div>
      </div>
    </main>
  );
}
