"use client";

import { useGuardedCreateKbPage } from "@/features/wiki/hooks/use-guarded-create-kb-page";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { isApiError } from "@/lib/api-envelope";
import {
  StatCard,
  StatCardGrid,
} from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  useKbAnalyticsOverview,
  useKbNoResults,
  usePageAnalytics,
  useKnowledgeGaps,
  useGapRelatedPages,
  useCitationReuse,
  useReviewSla,
  useAssignGap,
  useDismissGap,
  useCreateGapFix,
} from "@/hooks/api/kb";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
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
import { KnowledgeAnalyticsLists } from "./knowledge-analytics-lists";
import { AnalyticsSkeleton } from "./knowledge-analytics-skeleton";
import { KnowledgeAnalyticsGapsList } from "./knowledge-analytics-gaps-list";
import {
  KbBarChart2Icon,
  KbSearchIcon,
  KbThumbsUpIcon,
  KbEyeIcon,
  KbClockIcon,
  KbLink2Icon,
} from "@/features/wiki/lib/kb-icons";

const ALL_SPACES_VALUE = "all";

function formatRatioAsPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}%`;
}

function overviewValue(value: number | null, reason?: string, percent = false): string | number {
  if (reason === "minimum_cohort") return "Suppressed";
  if (reason === "incomplete_scope") return "Unavailable";
  if (value === null) return "Unavailable";
  return percent ? formatRatioAsPercent(value) : value;
}

function overviewHint(reason?: string): string | undefined {
  if (reason === "minimum_cohort") return "Fewer than 3 records in this cohort";
  if (reason === "incomplete_scope") return "Historical space attribution is incomplete";
  return undefined;
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

  const [selectedGapQuery, setSelectedGapQuery] = useState<string | undefined>(
    undefined,
  );
  const canCreatePage = useCan("kb:pages:create");
  const canManageAnalytics = useCan("kb:analytics:manage");

  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewQueryError,
    refetch: refetchOverview,
  } = useKbAnalyticsOverview(
    spaceId !== undefined ? { ...range, spaceId } : range,
    "wiki",
  );
  const {
    data: noResultsResponse,
    isLoading: noResultsLoading,
    isError: noResultsError,
    isFetchNextPageError: noResultsNextError,
    error: noResultsQueryError,
    refetch: refetchNoResults,
    fetchNextPage: fetchNextNoResults,
    hasNextPage: hasNextNoResults,
    isFetchingNextPage: isFetchingNextNoResults,
  } = useKbNoResults(spaceId !== undefined ? { ...range, spaceId } : range);
  const noResults = noResultsResponse?.data ?? [];
  const noResultsAccessLost = noResultsError && isApiError(noResultsQueryError) && (noResultsQueryError.status === 401 || noResultsQueryError.status === 403 || noResultsQueryError.status === 404);
  const noResultsPageError = noResultsError && (!noResultsNextError || noResultsAccessLost || noResults.length === 0);
  const {
    data: pageAnalytics = [],
    isLoading: pagesLoading,
    isError: pagesError,
    error: pagesQueryError,
    refetch: refetchPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePageAnalytics(staleOnly ? { spaceId, staleOnly: true } : { spaceId });
  const {
    gaps: loadedGaps,
    scopeComplete: gapsScopeComplete,
    isLoading: gapsLoading,
    isError: gapsError,
    error: gapsQueryError,
    refetch: refetchGaps,
    fetchNextPage: fetchNextGaps,
    hasNextPage: hasNextGaps,
    isFetchingNextPage: isFetchingNextGaps,
  } = useKnowledgeGaps(spaceId !== undefined ? { ...range, spaceId } : range);
  const gaps = loadedGaps ?? [];
  const {
    data: citationReuse,
    fetchNextPage: fetchNextCitationReuse,
    hasNextPage: hasNextCitationReuse,
    isFetchingNextPage: isFetchingNextCitationReuse,
  } = useCitationReuse(spaceId !== undefined ? { ...range, spaceId } : range);
  const { data: reviewSla } = useReviewSla(spaceId !== undefined ? { ...range, spaceId } : range);
  const {
    pages: relatedPages = [],
    isLoading: relatedPagesLoading,
    isError: relatedPagesError,
    error: relatedPagesReadError,
    isFetchNextPageError: relatedPagesNextError,
    refetch: refetchRelatedPages,
    fetchNextPage: fetchNextRelated,
    hasNextPage: hasNextRelated,
    isFetchingNextPage: isFetchingNextRelated,
  } = useGapRelatedPages(selectedGapQuery);

  const assignGap = useAssignGap();
  const dismissGap = useDismissGap();
  const createGapFix = useCreateGapFix();
  const router = useRouter();
  const createPage = useGuardedCreateKbPage((page) => router.push(pageHref(page.id)));

  function handleLoadMorePages() {
    void fetchNextPage();
  }

  function handleLoadMoreGaps() {
    void fetchNextGaps();
  }

  function handleLoadMoreRelated() {
    void fetchNextRelated();
  }

  function handleRetryRelatedPages() {
    if (relatedPagesNextError) {
      void fetchNextRelated();
      return;
    }
    void refetchRelatedPages();
  }

  function handleGapRowSelect(query: string) {
    setSelectedGapQuery((prev) => (prev === query ? undefined : query));
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
    void createPage.submit({ title: query, ...(spaceId !== undefined ? { spaceId } : {}) });
  }

  function handleAssignGap(query: string, assigneeUserId: string) {
    assignGap.mutate({ query, assigneeUserId });
  }

  function handleDismissGap(query: string, reason: string) {
    dismissGap.mutate({ query, reason });
  }

  function handleCreateGapFix(query: string) {
    createGapFix.mutate({ query, ...(spaceId !== undefined ? { spaceId } : {}) });
  }

  const pageState = usePageState({
    permission: "kb:analytics:view",
    isLoading: overviewLoading,
    isError: overviewError,
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
            <SelectTrigger className="w-52" aria-label="Team folder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SPACES_VALUE}>All team folders</SelectItem>
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
          <StatCardGrid cols={4} className="mb-4">
            <StatCard
              label="Article views"
              value={overviewValue(overview.totalViews, overview.suppressionReasons.totalViews)}
              hint={overviewHint(overview.suppressionReasons.totalViews)}
              icon={KbEyeIcon}
              tone="blue"
            />
            <StatCard
              label={spaceId === undefined ? "Organization searches" : "Space searches"}
              value={overviewValue(overview.searches, overview.suppressionReasons.searches)}
              hint={overviewHint(overview.suppressionReasons.searches)}
              icon={KbSearchIcon}
              tone="violet"
            />
            <StatCard
              label="Helpful ratio"
              value={overviewValue(overview.helpfulRatio, overview.suppressionReasons.helpfulRatio, true)}
              hint={overviewHint(overview.suppressionReasons.helpfulRatio)}
              icon={KbThumbsUpIcon}
              tone="emerald"
            />
            <StatCard
              label={spaceId === undefined ? "Organization search success" : "Space search success"}
              value={overviewValue(overview.searchSuccessRate, overview.suppressionReasons.searchSuccessRate, true)}
              hint={overviewHint(overview.suppressionReasons.searchSuccessRate)}
              icon={KbBarChart2Icon}
              tone="amber"
            />
          </StatCardGrid>
        ) : null}

        {spaceId !== undefined && overview && !overview.searchScopeComplete ? (
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            Team-folder-scoped search and Ask history is incomplete for this date range. Choose a newer range or All team folders to see complete activity metrics.
          </p>
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
                value={`${citationReuse.length}${hasNextCitationReuse ? "+" : ""}`}
                icon={KbLink2Icon}
                tone="violet"
              />
            ) : null}
          </StatCardGrid>
        )}
        {hasNextCitationReuse ? (
          <Button
            type="button"
            variant="outline"
            className="mb-4"
            onClick={() => void fetchNextCitationReuse()}
            disabled={isFetchingNextCitationReuse}
          >
            {isFetchingNextCitationReuse ? "Loading citations..." : "Load more citation results"}
          </Button>
        ) : null}

        <div className="space-y-4">
        <KnowledgeAnalyticsLists
          noResults={noResults}
          noResultsLoading={noResultsLoading}
          noResultsError={noResultsPageError}
          onRetryNoResults={() => void refetchNoResults()}
          noResultsScopeComplete={noResultsResponse?.scopeComplete}
          noResultsNextError={noResultsNextError}
          noResultsAccessLost={noResultsAccessLost}
          noResultsQueryError={noResultsQueryError}
          hasNextNoResults={!!hasNextNoResults}
          isFetchingNextNoResults={isFetchingNextNoResults}
          fetchNextNoResults={fetchNextNoResults}
          pageAnalytics={pageAnalytics}
          pagesLoading={pagesLoading}
          pagesError={pagesError}
          pagesQueryError={pagesQueryError}
          onRetryPages={() => void refetchPages()}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          handleLoadMorePages={handleLoadMorePages}
          spaceId={spaceId}
          isFiltered={isFiltered}
        />
        <KnowledgeAnalyticsGapsList
          gaps={gaps}
          gapsError={gapsError}
          gapsQueryError={gapsQueryError}
          onRetryGaps={() => void refetchGaps()}
          gapsScopeComplete={gapsScopeComplete}
          gapsLoading={gapsLoading}
          hasNextGaps={!!hasNextGaps}
          isFetchingNextGaps={isFetchingNextGaps}
          handleLoadMoreGaps={handleLoadMoreGaps}
          selectedGapQuery={selectedGapQuery}
          handleCreatePageFromGap={handleCreatePageFromGap}
          createPagePending={createPage.isSubmitting}
          handleGapRowSelect={handleGapRowSelect}
          handleAssignGap={handleAssignGap}
          assignGapPending={assignGap.isPending}
          handleDismissGap={handleDismissGap}
          dismissGapPending={dismissGap.isPending}
          handleCreateGapFix={handleCreateGapFix}
          createGapFixPending={createGapFix.isPending}
          canCreatePage={canCreatePage}
          canManageAnalytics={canManageAnalytics}
          relatedPages={relatedPages}
          relatedPagesLoading={relatedPagesLoading}
          relatedPagesError={relatedPagesError}
          relatedPagesReadError={relatedPagesReadError}
          handleRetryRelatedPages={handleRetryRelatedPages}
          hasNextRelated={!!hasNextRelated}
          isFetchingNextRelated={isFetchingNextRelated}
          handleLoadMoreRelated={handleLoadMoreRelated}
          spaceId={spaceId}
          isFiltered={isFiltered}
        />
        </div>
      </PageState>
    </PageWrapper>
  );
}
