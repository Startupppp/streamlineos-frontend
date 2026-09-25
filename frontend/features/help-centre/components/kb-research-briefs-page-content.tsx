"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Skeleton } from "@/components/ui/skeleton";
import { KbResearchBriefForm } from "@/features/help-centre/components/kb-research-brief-form";
import { KbResearchBriefCard } from "@/features/help-centre/components/kb-research-brief-card";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbResearchBriefs } from "@/hooks/api/kb/research-briefs";

function BriefListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

interface KbResearchBriefsPageContentProps {
  basePath: string;
}

export function KbResearchBriefsPageContent({ basePath }: KbResearchBriefsPageContentProps) {
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useKbResearchBriefs();
  const allBriefs = data?.pages.flatMap((p) => p.items) ?? [];

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Research Briefs"
      subtitle="AI-synthesized reports from your knowledge base"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <KbResearchBriefForm basePath={basePath} />

        {isLoading ? (
          <BriefListSkeleton />
        ) : isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load research briefs"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : allBriefs.length === 0 ? (
          <EmptyState
            compact
            title="No research briefs yet"
            description="Enter a topic above to generate your first AI research brief."
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-2">
            {allBriefs.map((brief) => (
              <KbResearchBriefCard key={brief.id} brief={brief} basePath={basePath} />
            ))}
            <InfiniteScrollSentinel
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              label="Load more research briefs"
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
