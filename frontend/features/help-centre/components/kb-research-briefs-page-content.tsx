"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageState } from "@/components/shared/page-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Skeleton } from "@/components/ui/skeleton";
import { KbResearchBriefForm } from "@/features/help-centre/components/kb-research-brief-form";
import { KbResearchBriefCard } from "@/features/help-centre/components/kb-research-brief-card";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbResearchBriefs } from "@/hooks/api/kb/research-briefs";
import { usePageState } from "@/hooks/api/use-page-state";

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
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } =
    useKbResearchBriefs();
  const allBriefs = data?.pages.flatMap((p) => p.items) ?? [];
  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError: isError && allBriefs.length === 0,
    error,
    isEmpty: allBriefs.length === 0,
  });

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Research Briefs"
      subtitle="AI-synthesized reports from your knowledge base"
    >
      <PageState
        resolution={pageState}
        loading={<BriefListSkeleton />}
        empty={
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <KbResearchBriefForm basePath={basePath} />
            <EmptyState
              compact
              title="No research briefs yet"
              description="Enter a topic above to generate your first AI research brief."
            />
          </div>
        }
        onRetry={handleRetry}
        className="flex-1"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <KbResearchBriefForm basePath={basePath} />
          <div className="flex flex-1 min-h-0 flex-col gap-2">
            {allBriefs.map((brief) => (
              <KbResearchBriefCard key={brief.id} brief={brief} basePath={basePath} />
            ))}
            {isFetchNextPageError ? (
              <ErrorState
                compact
                title="Couldn't load more research briefs"
                description={getErrorMessage(error)}
                onRetry={() => void fetchNextPage()}
              />
            ) : (
              <InfiniteScrollSentinel
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
                label="Load more research briefs"
              />
            )}
          </div>
        </div>
      </PageState>
    </PageWrapper>
  );
}
