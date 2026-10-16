"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/shared/page-state";
import { useKbSpaceArchiveImpact } from "@/hooks/api/kb/spaces";
import { usePageState } from "@/hooks/api/use-page-state";

interface SpaceArchiveImpactProps {
  spaceId: number;
}

export function SpaceArchiveImpact({ spaceId }: SpaceArchiveImpactProps) {
  const { data, isLoading, isError, error, refetch } = useKbSpaceArchiveImpact(spaceId, {
    enabled: true,
  });
  const impactState = usePageState({
    permission: "kb:spaces:manage",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && !data,
  });

  function handleRetry() {
    void refetch();
  }

  const parts = data ? [
    `${data.pageCount} ${data.pageCount === 1 ? "page" : "pages"}`,
    `${data.publicLinkCount} public ${data.publicLinkCount === 1 ? "link" : "links"}`,
    `${data.recordLinkCount} record ${data.recordLinkCount === 1 ? "link" : "links"}`,
  ] : [];

  if (data?.askIndexed) {
    parts.push("indexed for Ask");
  }

  return (
    <PageState
      resolution={impactState}
      compact
      onRetry={handleRetry}
      loading={<Skeleton className="mt-2 block h-4 w-3/4" />}
      empty={
        <div role="alert" className="mt-2 space-y-2 text-xs text-muted-foreground">
          <p>Archive impact is unavailable.</p>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>Retry archive impact</Button>
        </div>
      }
    >
      <span className="mt-2 block text-xs text-muted-foreground tabular-nums">
        This affects {parts.join(" · ")}.
      </span>
    </PageState>
  );
}
