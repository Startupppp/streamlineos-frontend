"use client";

import { useCallback, useMemo, useState } from "react";
import { useOpportunities, useEvidenceThemes, useOpportunitiesCompare, useOutcomeReviews } from "@/hooks/api/build/product-discovery";
import {
  useCreateOutcomeReview,
  useDeleteOutcomeReview,
  useUpdateOutcomeReview,
} from "@/hooks/api/build/product-discovery-mutations";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EvidenceThemesSection } from "./evidence-themes-section";
import { OpportunitiesTable } from "./opportunities-table";
import { OpportunitiesFilterBar } from "./opportunities-filter-bar";
import { OpportunityPane } from "./opportunity-pane";
import { CompareDrawer, COMPARE_MAX } from "./compare-drawer";
import { OutcomeReviewsSection } from "./outcome-reviews-section";
import { OpportunityCreateButton } from "./opportunity-create-sheet";
import { useOpportunityDiscoveryFilters } from "./use-opportunity-discovery-filters";
import type { CreateOutcomeReviewInput, UpdateOutcomeReviewInput } from "@/hooks/api/build/product-discovery-mutations";

interface ProductDiscoverySectionProps {
  managedProductId: number;
}

export function ProductDiscoverySection({ managedProductId }: ProductDiscoverySectionProps) {
  const {
    pageNumber,
    setPageNumber,
    setCursor,
    stateFilter,
    sortFilter,
    themePeriod,
    segmentFilter,
    ownerFilter,
    confidenceFilter,
    evidenceAgeFilter,
    scoreMinFilter,
    segmentOptions,
    ownerOptions,
    oppQueryParams,
    themeParams,
    isFiltered,
    handleStateChange,
    handleSortChange,
    handleThemePeriodChange,
    handleSegmentChange,
    handleOwnerChange,
    handleConfidenceChange,
    handleEvidenceAgeChange,
    handleScoreMinChange,
  } = useOpportunityDiscoveryFilters(managedProductId);

  const hasFilters = Object.keys(oppQueryParams).length > 0;
  const oppsQuery = useOpportunities(managedProductId, hasFilters ? oppQueryParams : undefined);
  const themesQuery = useEvidenceThemes(managedProductId, themeParams);
  const outcomeReviewsQuery = useOutcomeReviews(managedProductId);

  const [openOpportunityId, setOpenOpportunityId] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSelected, setCompareSelected] = useState<ReadonlySet<number>>(new Set());

  const compareIds = useMemo(
    () => (compareSelected.size >= 2 ? [...compareSelected] : []),
    [compareSelected],
  );
  const compareQuery = useOpportunitiesCompare(managedProductId, compareIds);

  const createOutcomeReviewMutation = useCreateOutcomeReview(managedProductId);
  const updateOutcomeReviewMutation = useUpdateOutcomeReview(managedProductId);
  const deleteOutcomeReviewMutation = useDeleteOutcomeReview(managedProductId);

  const handleNext = useCallback(() => {
    const nextCursor = oppsQuery.data?.pagination.nextCursor ?? null;
    setCursor(nextCursor);
    setPageNumber((n) => n + 1);
  }, [oppsQuery.data, setCursor, setPageNumber]);

  const handlePrevious = useCallback(() => {
    setCursor(null);
    setPageNumber((n) => Math.max(1, n - 1));
  }, [setCursor, setPageNumber]);

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
    (data: CreateOutcomeReviewInput, onCreated: () => void) => {
      createOutcomeReviewMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Review scheduled.");
          onCreated();
        },
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="opportunities-heading" className="text-sm font-semibold text-foreground">
            Opportunities
          </h2>
          <OpportunityCreateButton managedProductId={managedProductId} />
        </div>
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
        isCreating={createOutcomeReviewMutation.isPending}
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
