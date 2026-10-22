"use client";

import { memo } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { KbSearchIcon, KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { pageHref } from "@/lib/knowledge-routes";
import type { KbNoResultRow, KbPageAnalyticsRow } from "@/types/kb";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  in_review: "secondary",
  published: "default",
  archived: "secondary",
};

const NoResultsRow = memo(function NoResultsRow({
  row,
  rank,
}: {
  row: KbNoResultRow;
  rank: number;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors">
      <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">
        {rank}
      </span>
      <TruncatedText text={row.query ?? "(empty)"} className="flex-1 text-sm" />
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        {row.count}
      </span>
    </div>
  );
});

const PageAnalyticsTableRow = memo(function PageAnalyticsTableRow({
  row,
}: {
  row: KbPageAnalyticsRow;
}) {
  return (
    <div className="grid grid-cols-[1fr_3rem_3rem_3rem_auto_5rem] items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
      <Link
        href={pageHref(row.id)}
        className="text-sm truncate hover:underline text-foreground"
      >
        {row.title || "Untitled"}
      </Link>
      <span className="text-xs tabular-nums text-muted-foreground text-right">
        {row.uniqueViewers}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground text-right">
        {row.commentCount}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground text-right">
        {row.versionCount}
      </span>
      <Badge
        variant={STATUS_VARIANT[row.status] ?? "outline"}
        className="text-xs capitalize"
      >
        {row.status.replace("_", " ")}
      </Badge>
      <span className="text-xs text-muted-foreground text-right">
        {new Date(row.updatedAt).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        })}
      </span>
    </div>
  );
});

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <StatCardGridSkeleton cols={6} count={6} />
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s} className="space-y-2">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface KnowledgeAnalyticsListsProps {
  noResults: KbNoResultRow[];
  noResultsScopeComplete: boolean | undefined;
  noResultsNextError: boolean;
  noResultsAccessLost: boolean;
  noResultsQueryError: unknown;
  hasNextNoResults: boolean;
  isFetchingNextNoResults: boolean;
  fetchNextNoResults: () => unknown;
  pageAnalytics: KbPageAnalyticsRow[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  handleLoadMorePages: () => void;
  spaceId: number | undefined;
  isFiltered: boolean;
}

export function KnowledgeAnalyticsLists({
  noResults, noResultsScopeComplete, noResultsNextError, noResultsAccessLost,
  noResultsQueryError, hasNextNoResults, isFetchingNextNoResults, fetchNextNoResults,
  pageAnalytics, hasNextPage, isFetchingNextPage, handleLoadMorePages,
  spaceId, isFiltered,
}: KnowledgeAnalyticsListsProps) {
  function handleLoadMoreNoResults() {
    void fetchNextNoResults();
  }

  return (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                No-result searches
              </h2>
              {noResults.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {noResults.length}{hasNextNoResults ? "+" : ""} queries
                </span>
              )}
            </div>
            {spaceId !== undefined && noResultsScopeComplete === false ? (
              <p role="status" className="text-sm text-muted-foreground">
                Zero-result searches for this team folder are unavailable because older events lack team folder information.
              </p>
            ) : noResults.length === 0 ? (
              <EmptyState
                illustration={
                  <KbSearchIcon className="h-6 w-6 text-muted-foreground" />
                }
                title={
                  isFiltered
                    ? "No searches match these filters"
                    : "No zero-result searches"
                }
                description={
                  isFiltered
                    ? "Widen the window or clear the filters to see zero-result searches."
                    : "All recent searches returned at least one result."
                }
                compact
              />
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground w-5">
                    #
                  </span>
                  <span className="flex-1 text-xs font-medium text-muted-foreground">
                    Query
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Count
                  </span>
                </div>
                {noResults.map((row, i) => (
                  <NoResultsRow key={i} row={row} rank={i + 1} />
                ))}
                {noResultsNextError && !noResultsAccessLost ? (
                  <ErrorState
                    compact
                    title="Couldn't load more searches"
                    description={getErrorMessage(noResultsQueryError)}
                    error={noResultsQueryError}
                    onRetry={handleLoadMoreNoResults}
                  />
                ) : hasNextNoResults ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLoadMoreNoResults}
                    disabled={isFetchingNextNoResults}
                  >
                    {isFetchingNextNoResults ? "Loading searches..." : "Load more searches"}
                  </Button>
                ) : null}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Top pages
              </h2>
              {pageAnalytics.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {pageAnalytics.length} pages
                </span>
              )}
            </div>
            {pageAnalytics.length === 0 ? (
              <EmptyState
                illustration={
                  <KbFileTextIcon className="h-6 w-6 text-muted-foreground" />
                }
                title={
                  isFiltered
                    ? "No files match these filters"
                    : "No file data yet"
                }
                description={
                  isFiltered
                    ? "Widen the window, pick another team folder, or clear the filters."
                    : "File view data will appear here once users start reading files."
                }
                compact
              />
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                <div className="grid grid-cols-[1fr_3rem_3rem_3rem_auto_5rem] items-center gap-3 px-3 py-2 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">
                    Title
                  </span>
                  <span className="text-xs font-medium text-muted-foreground text-right">
                    Views
                  </span>
                  <span className="text-xs font-medium text-muted-foreground text-right">
                    Cmts
                  </span>
                  <span className="text-xs font-medium text-muted-foreground text-right">
                    Vers
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Status
                  </span>
                  <span className="text-xs font-medium text-muted-foreground text-right">
                    Updated
                  </span>
                </div>
                {pageAnalytics.map((row) => (
                  <PageAnalyticsTableRow key={row.id} row={row} />
                ))}
                <InfiniteScrollSentinel
                  hasNextPage={!!hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={handleLoadMorePages}
                  label="Load more files"
                />
              </div>
            )}
          </section>

        </>
  );
}
