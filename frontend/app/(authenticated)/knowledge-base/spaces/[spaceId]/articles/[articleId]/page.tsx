"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ListTree,
  Loader2,
  Pencil,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NotFoundIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { useKbArticle, useKbSpace, useVerifyKbArticle } from "@/lib/api/hooks/kb";
import { useOrgMembers } from "@/lib/api/hooks/organization";
import {
  ArticleContent,
  prepareArticle,
  type ArticleHeading,
} from "@/components/kb/article-content";
import { HelpfulVote } from "@/components/kb/helpful-vote";
import type { KbArticle, KbArticleStatus } from "@/types/kb";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
type VerificationStatus = "verified" | "overdue" | "unverified";

const STATUS_META: Record<KbArticleStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_review: { label: "In review", variant: "outline" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "destructive" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getVerification(article: KbArticle): VerificationStatus {
  if (!article.lastVerifiedAt) return "unverified";
  if (!article.reviewIntervalDays || article.reviewIntervalDays <= 0) return "verified";
  const dueAt = new Date(article.lastVerifiedAt).getTime() + article.reviewIntervalDays * DAY_MS;
  return Date.now() <= dueAt ? "verified" : "overdue";
}

function isMissingOrForbidden(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /\b40(3|4)\b/.test(error.message) || /not found/i.test(error.message);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy");
}

interface ArticleTocProps {
  headings: ArticleHeading[];
  containerRef: RefObject<HTMLDivElement | null>;
}

function ArticleToc({ headings, containerRef }: ArticleTocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { root, rootMargin: "0px 0px -65% 0px", threshold: 0 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings, containerRef]);

  function handleTocClick(event: MouseEvent<HTMLButtonElement>) {
    const id = event.currentTarget.dataset.headingId;
    if (!id) return;
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  return (
    <nav aria-label="Table of contents" className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ListTree className="h-3.5 w-3.5" /> On this page
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <button
              type="button"
              data-heading-id={heading.id}
              onClick={handleTocClick}
              className={cn(
                "-ml-px block w-full border-l py-1 pl-3 text-left text-sm leading-snug transition-colors hover:text-foreground",
                heading.level === 3 ? "pl-6 text-xs" : "",
                activeId === heading.id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <AlertTriangle className="h-3.5 w-3.5" /> Review overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <AlertTriangle className="h-3.5 w-3.5" /> Unverified
    </span>
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <div className="mt-3 flex flex-wrap gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-8">
        <div className="max-w-3xl space-y-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-4",
                index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-11/12" : "w-4/5",
              )}
            />
          ))}
        </div>
        <div className="mt-6 hidden space-y-2 lg:mt-0 lg:block">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-3.5 w-32" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function KbArticleReaderPage() {
  const params = useParams<{ spaceId: string; articleId: string }>();
  const spaceId = Number(params.spaceId);
  const articleId = Number(params.articleId);

  const scrollRef = useRef<HTMLDivElement>(null);

  const articleQuery = useKbArticle(articleId);
  const spaceQuery = useKbSpace(spaceId);
  const membersQuery = useOrgMembers(1, 100);
  const verify = useVerifyKbArticle();

  const article = articleQuery.data;

  const headings = useMemo<ArticleHeading[]>(
    () => prepareArticle(article?.content ?? "").headings,
    [article?.content],
  );

  const memberNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of membersQuery.data?.data ?? []) {
      if (member.name) map.set(member.userId, member.name);
    }
    return map;
  }, [membersQuery.data]);

  function resolvePerson(id: string | null): string | null {
    if (!id) return null;
    return memberNames.get(id) ?? "Unknown";
  }

  function handleVerify() {
    verify.mutate(
      { id: articleId },
      {
        onSuccess: () => toast.success("Article marked as verified"),
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  }

  if (articleQuery.isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <ArticleSkeleton />
        </div>
      </div>
    );
  }

  if (articleQuery.error && !isMissingOrForbidden(articleQuery.error)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <ErrorState
            title="Couldn't load this article"
            description={getApiError(articleQuery.error)}
            onRetry={() => articleQuery.refetch()}
          />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            illustration={<NotFoundIllustration />}
            title="Article not found"
            description="This article doesn't exist, was removed, or you don't have access to it."
            action={{ label: "Back to Knowledge Base", href: "/knowledge-base" }}
            className="w-full max-w-md"
          />
        </div>
      </div>
    );
  }

  const status = STATUS_META[article.status];
  const verification = getVerification(article);
  const author = resolvePerson(article.authorId);
  const owner = resolvePerson(article.ownerId);
  const hasToc = headings.length > 0;
  const tags = article.tags ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Link href="/knowledge-base" className="transition-colors hover:text-foreground">
              Knowledge Base
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link
              href={`/knowledge-base/spaces/${spaceId}`}
              className="max-w-[12rem] truncate transition-colors hover:text-foreground"
            >
              {spaceQuery.data?.name ?? "Space"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[16rem] truncate font-medium text-foreground">
              {article.title}
            </span>
          </nav>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="min-w-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {article.title}
            </h1>
            <div className="flex items-center gap-2 sm:shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/knowledge-base/spaces/${spaceId}/articles/${article.id}/edit`}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Link>
              </Button>
              <Button size="sm" onClick={handleVerify} disabled={verify.isPending}>
                {verify.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-1 h-4 w-4" />
                )}
                Verify
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {author && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> By {author}
              </span>
            )}
            {owner && owner !== author && <span>Owned by {owner}</span>}
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> Updated {formatDate(article.updatedAt)}
            </span>
            <Badge variant={status.variant} className="text-[11px]">
              {status.label}
            </Badge>
            <VerificationBadge status={verification} />
          </div>

          {article.excerpt && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {article.excerpt}
            </p>
          )}

          <div
            className={cn(
              "mt-6 lg:grid lg:gap-8",
              hasToc ? "lg:grid-cols-[minmax(0,1fr)_15rem]" : "lg:grid-cols-1",
            )}
          >
            <div className="min-w-0 max-w-3xl">
              <ArticleContent content={article.content} />

              <div className="mt-10 space-y-6 border-t border-border pt-6">
                <HelpfulVote articleId={article.id} />
                {tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {hasToc && (
              <aside className="mt-8 hidden lg:mt-0 lg:block">
                <div className="sticky top-2">
                  <ArticleToc headings={headings} containerRef={scrollRef} />
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
