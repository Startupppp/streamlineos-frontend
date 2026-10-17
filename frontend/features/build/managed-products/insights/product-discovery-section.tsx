"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOpportunities, useEvidenceThemes, useOpportunitiesCompare, useOutcomeReviews } from "@/hooks/api/build/product-discovery";
import {
  useCreateOutcomeReview,
  useDeleteOutcomeReview,
  useUpdateOutcomeReview,
} from "@/hooks/api/build/outcome-review-mutations";
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
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";
import type { CreateOutcomeReviewInput, UpdateOutcomeReviewInput } from "@/hooks/api/build/outcome-review-mutations";

interface ProductDiscoverySectionProps {
  managedProductId: number;
}

export function ProductDiscoverySection({ managedProductId }: ProductDiscoverySectionProps) {
  const {
    pageNumber,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    sortFilter,
    themePeriod,
    evidenceAgeFilter,
    scoreMinFilter,
    scoreMaxFilter,
    stateValues,
    segmentValues,
    ownerValues,
    themeValues,
    confidenceValues,
    segmentOptions,
    ownerOptions,
    themeOptions,
    oppQueryParams,
    themeParams,
    isFiltered,
    search,
    handleSearchChange,
    handleStateValuesChange,
    handleSortChange,
    handleThemePeriodChange,
    handleSegmentValuesChange,
    handleOwnerValuesChange,
    handleThemeValuesChange,
    handleConfidenceValuesChange,
    handleEvidenceAgeChange,
    handleScoreMinChange,
    handleScoreMaxChange,
    clearAll,
  } = useOpportunityDiscoveryFilters(managedProductId);

  const reviewsPager = useCursorPageStack();

  const hasFilters = Object.keys(oppQueryParams).length > 0;
  const oppsQuery = useOpportunities(managedProductId, hasFilters ? oppQueryParams : undefined);
  const themesQuery = useEvidenceThemes(managedProductId, themeParams);
  const outcomeReviewsQuery = useOutcomeReviews(
    managedProductId,
    reviewsPager.cursor ? { cursor: reviewsPager.cursor } : undefined,
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the only source: a state copy read once at mount ignored a
  // ?opportunity= that arrived later (reload after a tab normalisation,
  // Back/Forward), so the deep link did not reopen the pane (MP-B-007).
  const requestedOpportunity = Number(searchParams.get("opportunity"));
  const openOpportunityId =
    Number.isSafeInteger(requestedOpportunity) && requestedOpportunity > 0
      ? requestedOpportunity
      : null;
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
    goToNextPage(nextCursor);
  }, [oppsQuery.data, goToNextPage]);

  const handlePrevious = useCallback(() => {
    goToPreviousPage();
  }, [goToPreviousPage]);

  const handleRowClick = useCallback((row: { id: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("opportunity", String(row.id));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handlePaneClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("opportunity");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

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
    (reviewId: number, data: UpdateOutcomeReviewInput, onCompleted: () => void, onFailed: (err: unknown) => void) => {
      updateOutcomeReviewMutation.mutate(
        { outcomeReviewId: reviewId, ...data },
        {
          onSuccess: () => {
            toast.success("Review completed.");
            onCompleted();
          },
          onError: (err) => {
            toast.error(getErrorMessage(err));
            onFailed(err);
          },
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
  const handleThemesRetry = useCallback(() => void themesQuery.refetch(), [themesQuery]);
  const handleOpenCompare = useCallback(() => setCompareOpen(true), []);
  const handleReviewsRetry = useCallback(() => void outcomeReviewsQuery.refetch(), [outcomeReviewsQuery]);
  const handleReviewsNextPage = useCallback(
    () => reviewsPager.goToNextPage(outcomeReviewsQuery.data?.pagination.nextCursor ?? null),
    [reviewsPager, outcomeReviewsQuery.data],
  );

  const filterBar = (
    <OpportunitiesFilterBar
      stateValues={stateValues}
      sortFilter={sortFilter}
      segmentValues={segmentValues}
      ownerValues={ownerValues}
      themeValues={themeValues}
      confidenceValues={confidenceValues}
      evidenceAgeFilter={evidenceAgeFilter}
      scoreMinFilter={scoreMinFilter}
      scoreMaxFilter={scoreMaxFilter}
      search={search}
      segmentOptions={segmentOptions}
      ownerOptions={ownerOptions}
      themeOptions={themeOptions}
      onStateValuesChange={handleStateValuesChange}
      onSortChange={handleSortChange}
      onSegmentValuesChange={handleSegmentValuesChange}
      onOwnerValuesChange={handleOwnerValuesChange}
      onThemeValuesChange={handleThemeValuesChange}
      onConfidenceValuesChange={handleConfidenceValuesChange}
      onEvidenceAgeChange={handleEvidenceAgeChange}
      onScoreMinChange={handleScoreMinChange}
      onScoreMaxChange={handleScoreMaxChange}
      onSearchChange={handleSearchChange}
      onClearAll={clearAll}
    />
  );

  return (
    <div className="space-y-8" data-testid="product-discovery-section">
      <EvidenceThemesSection
        managedProductId={managedProductId}
        themes={themesQuery.data?.themes ?? []}
        suggestedThemes={themesQuery.data?.suggestedThemes ?? []}
        period={themePeriod || "30d"}
        onPeriodChange={handleThemePeriodChange}
        isError={themesQuery.isError}
        onRetry={handleThemesRetry}
      />

      <section aria-labelledby="opportunities-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="opportunities-heading" className="text-base font-semibold text-foreground">
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
          hasPrevious={hasPreviousPage}
          pageNumber={pageNumber}
          onRowClick={handleRowClick}
          selected={compareSelected}
          onToggleSelect={handleToggleCompare}
          onOpenCompare={handleOpenCompare}
          onRetry={handleOppsRetry}
        />
      </section>

      <OutcomeReviewsSection
        managedProductId={managedProductId}
        reviews={outcomeReviewsQuery.data?.data ?? []}
        isLoading={outcomeReviewsQuery.isLoading}
        isError={outcomeReviewsQuery.isError}
        onRetry={handleReviewsRetry}
        hasMore={outcomeReviewsQuery.data?.pagination.hasMore ?? false}
        hasPreviousPage={reviewsPager.hasPrevious}
        pageNumber={reviewsPager.page}
        onNextPage={handleReviewsNextPage}
        onPreviousPage={reviewsPager.goToPreviousPage}
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
