"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPagesRecent } from "@/hooks/api/kb";
import { pageHref, KB_FAVORITES } from "@/features/knowledge-base/lib/knowledge-routes";
import type { KbPage } from "@/hooks/api/kb/pages";
import { KbClockIcon, KbFileTextIcon } from "@/features/knowledge-base/lib/kb-icons";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function RecentRow({ page }: { page: KbPage }) {
  return (
    <Link
      href={pageHref(page.id)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      <span className="text-base shrink-0 w-5 text-center">
        {page.icon ?? <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />}
      </span>
      <span className="flex-1 text-sm truncate font-medium">{page.title || "Untitled"}</span>
      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
        <KbClockIcon className="h-3 w-3" />
        {timeAgo(page.updatedAt)}
      </span>
    </Link>
  );
}

function RecentSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function RecentPage() {
  const { data: pages = [], isLoading, isError } = useKbPagesRecent();

  const subtitle = pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : undefined;

  return (
    <PageWrapper title="Recent" subtitle={subtitle}>
      {isLoading && <RecentSkeleton />}

      {!isLoading && isError && (
        <EmptyState
          illustration={<KbClockIcon className="h-8 w-8 text-muted-foreground/40" />}
          title="Could not load recent pages"
          description="There was a problem fetching your recently visited pages."
        />
      )}

      {!isLoading && !isError && pages.length === 0 && (
        <EmptyState
          illustration={<KbClockIcon className="h-8 w-8 text-muted-foreground/40" />}
          title="No recent pages"
          description="Pages you visit will appear here."
          action={{ label: "Browse favorites", href: KB_FAVORITES }}
        />
      )}

      {!isLoading && !isError && pages.length > 0 && (
        <div className="space-y-1.5">
          {pages.map((page) => (
            <RecentRow key={page.id} page={page} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
