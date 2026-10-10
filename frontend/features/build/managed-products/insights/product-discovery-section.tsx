"use client";

import { useCallback, useMemo, useState } from "react";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useEvidenceThemes, useOpportunities, useOpportunitiesCompare, useOutcomeReviews } from "@/hooks/api/build/product-discovery";
import {
  useCreateOpportunity,
  useCreateOutcomeReview,
  useDeleteOutcomeReview,
  useUpdateOutcomeReview,
} from "@/hooks/api/build/product-discovery-mutations";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EvidenceThemesSection } from "./evidence-themes-section";
import { OpportunitiesTable } from "./opportunities-table";
import { OpportunityPane } from "./opportunity-pane";
import { CompareDrawer, COMPARE_MAX } from "./compare-drawer";
import { OutcomeReviewsSection } from "./outcome-reviews-section";
import type { CreateOutcomeReviewInput, UpdateOutcomeReviewInput } from "@/hooks/api/build/product-discovery-mutations";

const OPPORTUNITY_FILTER_DEFS = [
  { param: "oppState" },
  { param: "oppSort" },
  { param: "oppThemePeriod" },
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

  const oppQueryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (stateFilter && stateFilter !== "all") p.state = stateFilter;
    if (sortFilter && sortFilter !== "all") p.sort = sortFilter;
    if (filters.cursor) p.cursor = filters.cursor;
    return p;
  }, [stateFilter, sortFilter, filters.cursor]);

  const themeParams = useMemo(
    () =>
      themePeriod === "30d" || themePeriod === "90d" || themePeriod === "365d"
        ? { period: themePeriod as "30d" | "90d" | "365d" }
        : themePeriod === "all"
          ? { period: "all" as const }
          : undefined,
    [themePeriod],
  );

  const oppsQuery = useOpportunities(managedProductId, oppQueryParams);
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
    (v: string) => {
      filters.setValue("oppState", v);
      setPageNumber(1);
    },
    [filters],
  );

  const handleSortChange = useCallback(
    (v: string) => {
      filters.setValue("oppSort", v);
      setPageNumber(1);
    },
    [filters],
  );

  const handleThemePeriodChange = useCallback(
    (v: string) => filters.setValue("oppThemePeriod", v),
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

  const oppsRows = oppsQuery.data?.data ?? [];
  const oppsPagination = oppsQuery.data?.pagination ?? { limit: 20, hasMore: false, nextCursor: null };
  const isFiltered = stateFilter !== "all" || sortFilter !== "all";

  const allItemsForCompare = useMemo(
    () => oppsRows.map((r) => ({ id: r.id, title: r.title })),
    [oppsRows],
  );

  const handleOppsRetry = useCallback(() => void oppsQuery.refetch(), [oppsQuery]);

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
          stateFilter={stateFilter}
          sortFilter={sortFilter}
          onStateChange={handleStateChange}
          onSortChange={handleSortChange}
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
