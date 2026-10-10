"use client";

import { useCallback, useMemo, useState } from "react";
import { useBuildListFilters, BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import { useEvidenceThemes, useOpportunities, useOpportunitiesCompare, useOutcomeReviews } from "@/hooks/api/build/product-discovery";
import {
  useCreateOpportunity,
  useCreateOutcomeReview,
  useDeleteOutcomeReview,
  useUpdateOutcomeReview,
} from "@/hooks/api/build/product-discovery-mutations";
import { useFeedbucketSubmissionFacets } from "@/hooks/api/feedbucket";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EvidenceThemesSection } from "./evidence-themes-section";
import { OpportunitiesTable } from "./opportunities-table";
import { OpportunitiesFilterBar } from "./opportunities-filter-bar";
import { OpportunityPane } from "./opportunity-pane";
import { CompareDrawer, COMPARE_MAX } from "./compare-drawer";
import { OutcomeReviewsSection } from "./outcome-reviews-section";
import type { CreateOutcomeReviewInput, UpdateOutcomeReviewInput } from "@/hooks/api/build/product-discovery-mutations";

const OPPORTUNITY_FILTER_DEFS = [
  { param: "oppState" },
  { param: "oppSort" },
  { param: "oppThemePeriod" },
  { param: "oppSegment" },
  { param: "oppOwner" },
  { param: "oppConfidence" },
  { param: "oppEvidenceAge" },
  { param: "oppScoreMin" },
] as const;

interface ProductDiscoverySectionProps {
  managedProductId: number;
}

export function ProductDiscoverySection({ managedProductId }: ProductDiscoverySectionProps) {
  const filters = useBuildListFilters({
    filters: OPPORTUNITY_FILTER_DEFS,
    withSearch: false,
  });

  const stateFilter = filters.value("oppState");
  const sortFilter = filters.value("oppSort");
  const themePeriod = filters.value("oppThemePeriod");
  const segmentFilter = filters.value("oppSegment");
  const ownerFilter = filters.value("oppOwner");
  const confidenceFilter = filters.value("oppConfidence");
  const evidenceAgeFilter = filters.value("oppEvidenceAge");
  const scoreMinFilter = filters.value("oppScoreMin");

  const facetsQuery = useFeedbucketSubmissionFacets({ managedProductId });
  const membersQuery = useOrgMembers(1, 100);

  const segmentOptions = useMemo(() => [
    { value: "all", label: "All segments" },
    ...(facetsQuery.data?.segments ?? [])
      .filter((s): s is { value: string; count: number } => s.value !== null)
      .map((s) => ({ value: s.value, label: s.value })),
  ], [facetsQuery.data?.segments]);

  const ownerOptions = useMemo(() => [
    { value: "all", label: "All owners" },
    ...(membersQuery.data?.data ?? []).map((m) => ({
      value: String(m.membershipId),
      label: m.name ?? m.email,
    })),
  ], [membersQuery.data?.data]);

  const oppQueryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (stateFilter && stateFilter !== "all") p.state = stateFilter;
    if (sortFilter && sortFilter !== "all") p.sort = sortFilter;
    if (filters.cursor) p.cursor = filters.cursor;
    if (segmentFilter && segmentFilter !== BUILD_FILTER_ALL) p.segment = segmentFilter;
    if (ownerFilter && ownerFilter !== BUILD_FILTER_ALL) p.ownerMembershipId = ownerFilter;
    if (confidenceFilter && confidenceFilter !== "all") p.confidence = confidenceFilter;
    if (evidenceAgeFilter && evidenceAgeFilter !== "all") p.evidenceAgeDays = evidenceAgeFilter;
    if (scoreMinFilter && scoreMinFilter !== "all") p.scoreMin = scoreMinFilter;
    return p;
  }, [stateFilter, sortFilter, filters.cursor, segmentFilter, ownerFilter, confidenceFilter, evidenceAgeFilter, scoreMinFilter]);

  const themeParams = useMemo(
    () =>
      themePeriod === "30d" || themePeriod === "90d" || themePeriod === "365d"
        ? { period: themePeriod as "30d" | "90d" | "365d" }
        : themePeriod === "all"
          ? { period: "all" as const }
          : undefined,
    [themePeriod],
  );

  const hasFilters = Object.keys(oppQueryParams).length > 0;
  const oppsQuery = useOpportunities(managedProductId, hasFilters ? oppQueryParams : undefined);
  const themesQuery = useEvidenceThemes(managedProductId, themeParams);
  const outcomeReviewsQuery = useOutcomeReviews(managedProductId);

  const [openOpportunityId, setOpenOpportunityId] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSelected, setCompareSelected] = useState<ReadonlySet<number>>(new Set());
  const [pageNumber, setPageNumber] = useState(1);

  const compareIds = useMemo(
    () => (compareSelected.size >= 2 ? [...compareSelected] : []),
    [compareSelected],
  );
  const compareQuery = useOpportunitiesCompare(managedProductId, compareIds);

  const createOpportunityMutation = useCreateOpportunity(managedProductId);
  const createOutcomeReviewMutation = useCreateOutcomeReview(managedProductId);
  const updateOutcomeReviewMutation = useUpdateOutcomeReview(managedProductId);
  const deleteOutcomeReviewMutation = useDeleteOutcomeReview(managedProductId);

  const handleStateChange = useCallback(
    (v: string) => { filters.setValue("oppState", v); setPageNumber(1); },
    [filters],
  );
  const handleSortChange = useCallback(
    (v: string) => { filters.setValue("oppSort", v); setPageNumber(1); },
    [filters],
  );
  const handleThemePeriodChange = useCallback(
    (v: string) => filters.setValue("oppThemePeriod", v),
    [filters],
  );
  const handleSegmentChange = useCallback(
    (v: string) => { filters.setValue("oppSegment", v); setPageNumber(1); },
    [filters],
  );
  const handleOwnerChange = useCallback(
    (v: string) => { filters.setValue("oppOwner", v); setPageNumber(1); },
    [filters],
  );
  const handleConfidenceChange = useCallback(
    (v: string) => { filters.setValue("oppConfidence", v); setPageNumber(1); },
    [filters],
  );
  const handleEvidenceAgeChange = useCallback(
    (v: string) => { filters.setValue("oppEvidenceAge", v); setPageNumber(1); },
    [filters],
  );
  const handleScoreMinChange = useCallback(
    (v: string) => { filters.setValue("oppScoreMin", v); setPageNumber(1); },
    [filters],
  );

  const handleNext = useCallback(() => {
    const nextCursor = oppsQuery.data?.pagination.nextCursor ?? null;
    filters.setCursor(nextCursor);
    setPageNumber((n) => n + 1);
  }, [oppsQuery.data, filters]);

  const handlePrevious = useCallback(() => {
    filters.setCursor(null);
    setPageNumber((n) => Math.max(1, n - 1));
  }, [filters]);

  const handleRowClick = useCallback((row: { id: number }) => {
    setOpenOpportunityId(row.id);
  }, []);

  const handlePaneClose = useCallback(() => setOpenOpportunityId(null), []);

  const handleToggleCompare = useCallback((id: number) => {
    setCompareSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < COMPARE_MAX) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDeselectCompare = useCallback((id: number) => {
    setCompareSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleCreateOutcomeReview = useCallback(
    (data: CreateOutcomeReviewInput) => {
      createOutcomeReviewMutation.mutate(data, {
        onSuccess: () => toast.success("Review scheduled."),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [createOutcomeReviewMutation],
  );

  const handleCompleteOutcomeReview = useCallback(
    (reviewId: number, data: UpdateOutcomeReviewInput) => {
      updateOutcomeReviewMutation.mutate(
        { outcomeReviewId: reviewId, ...data },
        {
          onSuccess: () => toast.success("Review completed."),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateOutcomeReviewMutation],
  );

  const handleDeleteOutcomeReview = useCallback(
    (reviewId: number) => {
      deleteOutcomeReviewMutation.mutate(reviewId, {
        onSuccess: () => toast.success("Review deleted."),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteOutcomeReviewMutation],
  );

  const oppsRows = useMemo(() => oppsQuery.data?.data ?? [], [oppsQuery.data]);
  const oppsPagination = oppsQuery.data?.pagination ?? { limit: 20, hasMore: false, nextCursor: null };
  const isFiltered = !!(
    (stateFilter && stateFilter !== "all") ||
    (segmentFilter && segmentFilter !== BUILD_FILTER_ALL) ||
    (ownerFilter && ownerFilter !== BUILD_FILTER_ALL) ||
    (confidenceFilter && confidenceFilter !== "all") ||
    (evidenceAgeFilter && evidenceAgeFilter !== "all") ||
    (scoreMinFilter && scoreMinFilter !== "all")
  );

  const allItemsForCompare = useMemo(
    () => oppsRows.map((r) => ({ id: r.id, title: r.title })),
    [oppsRows],
  );

  const handleOppsRetry = useCallback(() => void oppsQuery.refetch(), [oppsQuery]);

  const filterBar = (
    <OpportunitiesFilterBar
      stateFilter={stateFilter}
      sortFilter={sortFilter}
      segmentFilter={segmentFilter}
      ownerFilter={ownerFilter}
      confidenceFilter={confidenceFilter}
      evidenceAgeFilter={evidenceAgeFilter}
      scoreMinFilter={scoreMinFilter}
      segmentOptions={segmentOptions}
      ownerOptions={ownerOptions}
      onStateChange={handleStateChange}
      onSortChange={handleSortChange}
      onSegmentChange={handleSegmentChange}
      onOwnerChange={handleOwnerChange}
      onConfidenceChange={handleConfidenceChange}
      onEvidenceAgeChange={handleEvidenceAgeChange}
      onScoreMinChange={handleScoreMinChange}
    />
  );

  return (
    <div className="space-y-8">
      <EvidenceThemesSection
        managedProductId={managedProductId}
        themes={themesQuery.data?.themes ?? []}
        suggestedThemes={themesQuery.data?.suggestedThemes ?? []}
        period={themePeriod || "30d"}
        onPeriodChange={handleThemePeriodChange}
      />

      <section aria-labelledby="opportunities-heading">
        <h2 id="opportunities-heading" className="mb-4 text-sm font-semibold text-foreground">
          Opportunities
        </h2>
        <OpportunitiesTable
          managedProductId={managedProductId}
          rows={oppsRows}
          pagination={oppsPagination}
          isLoading={oppsQuery.isLoading}
          isError={oppsQuery.isError}
          error={oppsQuery.error}
          isFiltered={isFiltered}
          filtersSlot={filterBar}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasPrevious={pageNumber > 1}
          pageNumber={pageNumber}
          onRowClick={handleRowClick}
          selected={compareSelected}
          onToggleSelect={handleToggleCompare}
          onOpenCompare={() => setCompareOpen(true)}
          onRetry={handleOppsRetry}
        />
      </section>

      <OutcomeReviewsSection
        managedProductId={managedProductId}
        reviews={outcomeReviewsQuery.data?.data ?? []}
        isLoading={outcomeReviewsQuery.isLoading}
        onCreate={handleCreateOutcomeReview}
        onComplete={handleCompleteOutcomeReview}
        onDelete={handleDeleteOutcomeReview}
        isCreating={createOpportunityMutation.isPending}
        isUpdating={updateOutcomeReviewMutation.isPending}
      />

      <OpportunityPane
        managedProductId={managedProductId}
        opportunityId={openOpportunityId}
        onClose={handlePaneClose}
      />

      <CompareDrawer
        open={compareOpen}
        onOpenChange={setCompareOpen}
        selected={compareSelected}
        onDeselect={handleDeselectCompare}
        compareData={compareQuery.data}
        isLoading={compareQuery.isLoading}
        allItems={allItemsForCompare}
      />
    </div>
  );
}
