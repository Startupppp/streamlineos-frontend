"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { pageHref } from "@/lib/knowledge-routes";
import { KbSearchIcon, KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { GapTableRow } from "./knowledge-analytics-gap-row";
import type { KbGapRow, KbGapRelatedPageRow } from "@/types/kb";

export interface KnowledgeAnalyticsGapsListProps {
  gaps: KbGapRow[];
  gapsScopeComplete: boolean;
  gapsLoading: boolean;
  gapsError: boolean;
  gapsQueryError: unknown;
  onRetryGaps: () => void;
  hasNextGaps: boolean;
  isFetchingNextGaps: boolean;
  handleLoadMoreGaps: () => void;
  selectedGapQuery: string | undefined;
  handleCreatePageFromGap: (query: string) => void;
  createPagePending: boolean;
  handleGapRowSelect: (query: string) => void;
  handleAssignGap: (query: string, assigneeUserId: string) => void;
  assignGapPending: boolean;
  handleDismissGap: (query: string, reason: string) => void;
  dismissGapPending: boolean;
  handleCreateGapFix: (query: string) => void;
  createGapFixPending: boolean;
  canCreatePage: boolean;
  canManageAnalytics: boolean;
  relatedPages: KbGapRelatedPageRow[];
  relatedPagesLoading: boolean;
  relatedPagesError: boolean;
  relatedPagesReadError: unknown;
  handleRetryRelatedPages: () => void;
  hasNextRelated: boolean;
  isFetchingNextRelated: boolean;
  handleLoadMoreRelated: () => void;
  spaceId: number | undefined;
  isFiltered: boolean;
}

export function KnowledgeAnalyticsGapsList({
  gaps, gapsScopeComplete, gapsLoading, gapsError, gapsQueryError, onRetryGaps,
  hasNextGaps, isFetchingNextGaps,
  handleLoadMoreGaps, selectedGapQuery, handleCreatePageFromGap, createPagePending,
  handleGapRowSelect, handleAssignGap, assignGapPending, handleDismissGap,
  dismissGapPending, handleCreateGapFix, createGapFixPending, canCreatePage, canManageAnalytics,
  relatedPages, relatedPagesLoading, relatedPagesError, relatedPagesReadError,
  handleRetryRelatedPages, hasNextRelated, isFetchingNextRelated,
  handleLoadMoreRelated, spaceId, isFiltered,
}: KnowledgeAnalyticsGapsListProps) {
  return (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Knowledge gaps
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Searches that returned no results — write pages to close these
                  gaps.
                </p>
              </div>
              {gaps.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {gaps.length} gaps
                </span>
              )}
            </div>
            {gapsLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : gapsError && gaps.length === 0 ? (
              <ErrorState compact title="Couldn't load knowledge gaps" error={gapsQueryError} onRetry={onRetryGaps} />
            ) : spaceId !== undefined && !gapsScopeComplete ? (
              <p role="status" className="text-sm text-muted-foreground">
                Knowledge gaps for this team folder are unavailable because older events lack team folder information.
              </p>
            ) : gaps.length === 0 ? (
              <EmptyState
                illustration={
                  <KbSearchIcon className="h-6 w-6 text-muted-foreground" />
                }
                title={
                  isFiltered
                    ? "No gaps match these filters"
                    : "No knowledge gaps"
                }
                description={
                  isFiltered
                    ? "Widen the window or clear the filters to see knowledge gaps."
                    : "All searches are finding relevant content."
                }
                compact
              />
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-border">
                  <span className="flex-1 text-xs font-medium text-muted-foreground">
                    Query
                  </span>
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    Count
                  </span>
                  <span className="text-xs font-medium text-muted-foreground shrink-0 w-28 text-right">
                    Last searched
                  </span>
                  <span className="text-xs font-medium text-muted-foreground shrink-0 w-24 text-right">
                    Action
                  </span>
                </div>
                {gaps.map((row, i) => (
                  <div key={i}>
                    <GapTableRow
                      row={row}
                      onCreatePage={handleCreatePageFromGap}
                      isCreating={createPagePending}
                      isSelected={selectedGapQuery === row.query}
                      onSelect={handleGapRowSelect}
                      onAssign={handleAssignGap}
                      isAssigning={assignGapPending}
                      onDismiss={handleDismissGap}
                      isDismissing={dismissGapPending}
                      onCreateFix={handleCreateGapFix}
                      isCreatingFix={createGapFixPending}
                      canCreatePage={canCreatePage}
                      canManageAnalytics={canManageAnalytics}
                    />
                    {selectedGapQuery === row.query && (
                      <div className="px-3 py-2 bg-muted/30 border-t border-border/40">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Pages containing this query
                        </p>
                        {relatedPagesLoading ? (
                          <div className="space-y-1">
                            {Array.from({ length: 3 }).map((_, s) => (
                              <Skeleton
                                key={s}
                                className="h-7 w-full rounded"
                              />
                            ))}
                          </div>
                        ) : relatedPagesError && relatedPages.length === 0 ? (
                          <ErrorState
                            compact
                            title="Could not load related pages"
                            error={relatedPagesReadError}
                            onRetry={handleRetryRelatedPages}
                          />
                        ) : relatedPages.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No existing pages mention this query.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {relatedPages.map((page) => (
                              <Link
                                key={page.id}
                                href={pageHref(page.id)}
                                className="flex items-center gap-2 text-xs text-foreground hover:underline py-0.5"
                              >
                                <KbFileTextIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                {page.title || "Untitled"}
                              </Link>
                            ))}
                            {relatedPagesError ? (
                              <ErrorState
                                compact
                                title="Could not load more related pages"
                                error={relatedPagesReadError}
                                onRetry={handleRetryRelatedPages}
                              />
                            ) : (
                              <InfiniteScrollSentinel
                                hasNextPage={!!hasNextRelated}
                                isFetchingNextPage={isFetchingNextRelated}
                                onLoadMore={handleLoadMoreRelated}
                                label="Load more related pages"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {gapsError ? (
                  <ErrorState compact title="Couldn't load more gaps" error={gapsQueryError} onRetry={onRetryGaps} />
                ) : <InfiniteScrollSentinel
                  hasNextPage={!!hasNextGaps}
                  isFetchingNextPage={isFetchingNextGaps}
                  onLoadMore={handleLoadMoreGaps}
                  label="Load more gaps"
                />}
              </div>
            )}
          </section>
  );
}
