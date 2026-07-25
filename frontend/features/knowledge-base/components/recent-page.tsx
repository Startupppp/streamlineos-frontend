"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { useKbPagesRecent } from "@/hooks/api/kb";
import {
  pageHref,
  KB_FAVORITES,
} from "@/features/knowledge-base/lib/knowledge-routes";
import type { KbPage } from "@/hooks/api/kb/pages";
import {
  KbClockIcon,
  KbFileTextIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { TruncatedText } from "@/components/ui/truncated-text";
import { kbTimeAgo } from "@/features/knowledge-base/lib/kb-date-utils";

function RecentRow({ page }: { page: KbPage }) {
  return (
    <Link
      href={pageHref(page.id)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      <span className="text-base shrink-0 w-5 text-center">
        {page.icon ?? (
          <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </span>
      <TruncatedText text={page.title || "Untitled"} className="flex-1 text-sm font-medium" />
      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
        <KbClockIcon className="h-3 w-3" />
        {kbTimeAgo(page.updatedAt)}
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
  const { data: pages = [], isLoading, isError, refetch } = useKbPagesRecent();

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper title="Recent" subtitle="Pages you have visited recently">
      {isLoading && <RecentSkeleton />}

      {!isLoading && isError && (
        <EmptyState
          illustration={<EmptyTimeIllustration />}
          title="Could not load recent pages"
          description="There was a problem fetching your recently visited pages."
          action={{ label: "Try again", onClick: handleRetry }}
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && pages.length === 0 && (
        <EmptyState
          illustration={<EmptyTimeIllustration />}
          title="No recent pages"
          description="Pages you visit will appear here."
          action={{ label: "Browse favorites", href: KB_FAVORITES }}
          className={CONTENT_FILL_PANEL}
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
