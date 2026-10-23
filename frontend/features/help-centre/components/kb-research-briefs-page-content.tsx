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

export function BriefListSkeleton() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="w-full space-y-1.5 sm:w-40">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-full shrink-0 rounded-md sm:w-32" />
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(4.25rem,1fr)] gap-2 overflow-hidden">
        {Array.from({ length: 18 }, (_, index) => (
          <div
            key={index}
            className="flex h-full min-h-0 items-start gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>
        ))}
      </div>
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
