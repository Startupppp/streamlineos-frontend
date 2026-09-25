"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import {
  useKbAnalyticsOverview,
  useKbNoResults,
  usePageAnalytics,
  useKnowledgeGaps,
  useCitationReuse,
  useReviewSla,
  useCreateKbPage,
} from "@/hooks/api/kb";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import {
  ANALYTICS_RANGE_LABELS,
  ANALYTICS_RANGE_PRESETS,
  DEFAULT_ANALYTICS_RANGE_PRESET,
  analyticsRangeFor,
  analyticsSpaceIdFrom,
} from "@/features/wiki/lib/analytics-range";
import { pageHref } from "@/lib/knowledge-routes";
import {
  KbBarChart2Icon,
  KbSearchIcon,
  KbThumbsUpIcon,
  KbFileTextIcon,
  KbEyeIcon,
  KbPlusIcon,
  KbClockIcon,
  KbCheckCircleIcon,
  KbLink2Icon,
} from "@/features/wiki/lib/kb-icons";
import type { KbNoResultRow, KbPageAnalyticsRow, KbGapRow } from "@/types/kb";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  in_review: "secondary",
  published: "default",
  archived: "secondary",
};

const TRUST_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  unverified: "outline",
  verified: "default",
  verification_expired: "destructive",
};

const NoResultsRow = memo(function NoResultsRow({ row, rank }: { row: KbNoResultRow; rank: number }) {
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

const PageAnalyticsTableRow = memo(function PageAnalyticsTableRow({ row }: { row: KbPageAnalyticsRow }) {
  return (
    <div className="grid grid-cols-[1fr_3rem_3rem_3rem_auto_auto_5rem] items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
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
      <Badge
        variant={TRUST_VARIANT[row.trustState] ?? "outline"}
        className="text-xs capitalize"
      >
        {row.trustState.replace("_", " ")}
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

const GapTableRow = memo(function GapTableRow({
  row,
  onCreatePage,
  isCreating,
}: {
  row: KbGapRow;
  onCreatePage: (q: string) => void;
  isCreating: boolean;
}) {
  function handleClick() {
    if (row.query) onCreatePage(row.query);
  }
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
      <TruncatedText text={row.query ?? "(empty)"} className="flex-1 text-sm" />
      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
        {row.count}
      </span>
      <span className="text-xs text-muted-foreground shrink-0 w-28 text-right">
        {new Date(row.lastOccurredAt).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="px-2 text-xs gap-1 shrink-0"
        onClick={handleClick}
        disabled={isCreating || !row.query}
      >
        <KbPlusIcon className="h-3 w-3" />
        Create page
      </Button>
    </div>
  );
});

const ALL_SPACES_VALUE = "all";

function formatRatioAsPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}%`;
}

function AnalyticsSkeleton() {
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

export default function KnowledgeAnalyticsPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters();

  const rangePreset = parseEnum<typeof ANALYTICS_RANGE_PRESETS>(
    searchParams.get("range"),
    ANALYTICS_RANGE_PRESETS,
    DEFAULT_ANALYTICS_RANGE_PRESET,
  );
  const spaceId = analyticsSpaceIdFrom(searchParams.get("space"));
  const staleOnly = searchParams.get("stale") === "1";
  const range = analyticsRangeFor(rangePreset, new Date());
  const isFiltered =
    rangePreset !== DEFAULT_ANALYTICS_RANGE_PRESET ||
    spaceId !== undefined ||
    staleOnly;

  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

  const { data: overview, isLoading: overviewLoading, isError: overviewError, error: overviewQueryError, refetch: refetchOverview } =
    useKbAnalyticsOverview(spaceId !== undefined ? { ...range, spaceId } : range);
  const { data: noResults = [], isLoading: noResultsLoading, isError: noResultsError, refetch: refetchNoResults } =
    useKbNoResults(range);
  const {
    data: pageAnalytics = [],
    isLoading: pagesLoading,
    isError: pagesError,
    refetch: refetchPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePageAnalytics(
    staleOnly ? { spaceId, staleOnly: true } : { spaceId },
  );
  const { data: gaps = [], isLoading: gapsLoading, isError: gapsError, refetch: refetchGaps } = useKnowledgeGaps(range);
  const { data: citationReuse } = useCitationReuse(range);
  const { data: reviewSla } = useReviewSla(range);
  const createPage = useCreateKbPage();
  const router = useRouter();

  function handleLoadMorePages() {
    void fetchNextPage();
  }

  function handleRangeChange(value: string) {
    updateFilters({ range: value });
  }

  function handleSpaceChange(value: string) {
    updateFilters({ space: value === ALL_SPACES_VALUE ? null : value });
  }

  function handleStaleOnlyToggle() {
    updateFilters({ stale: staleOnly ? null : "1" });
  }

  function handleClearFilters() {
    updateFilters({ range: null, space: null, stale: null });
  }

  function handleRetry() {
    void refetchOverview();
    void refetchNoResults();
    void refetchPages();
    void refetchGaps();
  }

  function handleCreatePageFromGap(query: string) {
    createPage.mutate(
      { title: query },
      {
        onSuccess(page) {
          router.push(pageHref(page.id));
        },
      },
    );
  }

  const pageState = usePageState({
    permission: "kb:analytics:view",
    isLoading: overviewLoading || noResultsLoading || pagesLoading || gapsLoading,
    isError: overviewError || noResultsError || pagesError || gapsError,
    error: overviewQueryError,
    isEmpty: !overview,
  });

  return (
    <PageWrapper title="Analytics">
      <PageState
        resolution={pageState}
        className="flex-1"
        onRetry={handleRetry}
        loading={<AnalyticsSkeleton />}
        empty={
          <ErrorState
            title="Analytics didn't finish loading"
            description="The request was interrupted before the figures arrived, so nothing here would be accurate."
            onRetry={handleRetry}
            className="flex-1"
          />
        }
      >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={rangePreset} onValueChange={handleRangeChange}>
          <SelectTrigger className="w-44" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANALYTICS_RANGE_PRESETS.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {ANALYTICS_RANGE_LABELS[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={spaceId === undefined ? ALL_SPACES_VALUE : String(spaceId)}
          onValueChange={handleSpaceChange}
        >
          <SelectTrigger className="w-52" aria-label="Space">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SPACES_VALUE}>All spaces</SelectItem>
            {spaces.map((space) => (
              <SelectItem key={space.id} value={String(space.id)}>
                {space.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={staleOnly ? "default" : "outline"}
          size="sm"
          aria-pressed={staleOnly}
          onClick={handleStaleOnlyToggle}
          className="gap-1"
        >
          <KbClockIcon className="h-3.5 w-3.5" />
          Stale high-use only
        </Button>
        {isFiltered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {overview ? (
      <StatCardGrid cols={5} className="mb-4">
        <StatCard
          label="Article views"
          value={overview.totalViews}
          icon={KbEyeIcon}
          tone="blue"
        />
        <StatCard
          label="Searches"
          value={overview.searches}
          icon={KbSearchIcon}
          tone="violet"
        />
        <StatCard
          label="Helpful ratio"
          value={formatRatioAsPercent(overview.helpfulRatio)}
          icon={KbThumbsUpIcon}
          tone="emerald"
        />
        <StatCard
          label="Search success"
          value={formatRatioAsPercent(overview.searchSuccessRate)}
          icon={KbBarChart2Icon}
          tone="amber"
        />
        <StatCard
          label="Tickets deflected"
          value={overview.ticketsDeflected}
          icon={KbCheckCircleIcon}
          tone="emerald"
        />
      </StatCardGrid>
      ) : null}

      {(reviewSla || citationReuse) && (
      <StatCardGrid cols={2} className="mb-4">
        {reviewSla ? (
          <StatCard
            label="Review SLA met"
            value={formatRatioAsPercent(reviewSla.slaRate)}
            icon={KbClockIcon}
            tone="amber"
          />
        ) : null}
        {citationReuse ? (
          <StatCard
            label="Reused citations"
            value={citationReuse.length}
            icon={KbLink2Icon}
            tone="violet"
          />
        ) : null}
      </StatCardGrid>
      )}

      <div className="space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              No-result searches
            </h2>
            {noResults.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {noResults.length} queries
              </span>
            )}
          </div>
          {noResults.length === 0 ? (
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
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Top pages</h2>
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
                isFiltered ? "No pages match these filters" : "No page data yet"
              }
              description={
                isFiltered
                  ? "Widen the window, pick another space, or clear the filters."
                  : "Page view data will appear here once users start reading pages."
              }
              compact
            />
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
              <div className="grid grid-cols-[1fr_3rem_3rem_3rem_auto_auto_5rem] items-center gap-3 px-3 py-2 border-b border-border">
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
                <span className="text-xs font-medium text-muted-foreground">
                  Trust
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
                label="Load more pages"
              />
            </div>
          )}
        </section>

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
          {gaps.length === 0 ? (
            <EmptyState
              illustration={
                <KbSearchIcon className="h-6 w-6 text-muted-foreground" />
              }
              title={
                isFiltered ? "No gaps match these filters" : "No knowledge gaps"
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
                <GapTableRow
                  key={i}
                  row={row}
                  onCreatePage={handleCreatePageFromGap}
                  isCreating={createPage.isPending}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      </PageState>
    </PageWrapper>
  );
}
