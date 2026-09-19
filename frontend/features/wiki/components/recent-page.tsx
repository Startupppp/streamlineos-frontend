"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";

import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { useKbPagesRecent } from "@/hooks/api/kb";
import {
  pageHref,
  KNOWLEDGE_BASE,
} from "@/lib/knowledge-routes";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";

function RecentCard({ page }: { page: KbPageListItem }) {
  return (
    <WikiPageCard
      href={pageHref(page.id)}
      title={page.title}
      icon={page.icon}
      coverImage={page.coverImage}
      subtitle={kbTimeAgo(page.updatedAt)}
    />
  );
}

function RecentSkeleton() {
  return (
    <div className={WIKI_PAGE_CARD_GRID_CLASS}>
      {Array.from({ length: 6 }).map((_, skeletonIndex) => (
        <Skeleton key={skeletonIndex} className="h-28 w-full rounded-lg" />
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
          action={{ label: "Browse wiki", href: KNOWLEDGE_BASE }}
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && pages.length > 0 && (
        <div className={WIKI_PAGE_CARD_GRID_CLASS}>
          {pages.map((page) => (
            <RecentCard key={page.id} page={page} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
