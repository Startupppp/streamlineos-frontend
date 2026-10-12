"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import {
  useFeedbucketSubmissions,
  useFeedbucketSubmissionFacets,
} from "@/hooks/api/feedbucket";
import { useCrmOrganizationsForPicker } from "@/hooks/api/crm/organizations";
import { useCan } from "@/hooks/api/access";
import { SubmissionBulkToolbar } from "@/components/shared/submission-bulk-toolbar";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { Button } from "@/components/ui/button";
import {
  type SubmissionRow,
  FEEDBACK_SKELETON_HEADERS,
} from "./product-feedback-columns";
import { ProductFeedbackMobileCard } from "./feedback/product-feedback-mobile-card";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import {
  useProductFeedbackFilters,
  PAGE_SIZE,
} from "./use-product-feedback-filters";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
  ManagedProductNotFound,
} from "./managed-product-detail-layout";
import { buildCraftedFeedbackColumns } from "./feedback/feedback-inbox-columns";
import { useRouteToIntake } from "./feedback/route-to-intake-dialog";
import { ProductFeedbackFilters } from "./product-feedback-filters";
import { ProductFeedbackDialogs } from "./product-feedback-dialogs";
import { CustomerImpactPanel } from "./customer-impact-panel";
import { useProductReturn } from "@/features/build/shared/product-return-href";

function resolveRowClassName(): string {
  return "cursor-pointer";
}

interface ProductFeedbackPageProps {
  managedProductId: number;
}

export function ProductFeedbackPage({
  managedProductId,
}: ProductFeedbackPageProps) {
  const productQuery = useManagedProduct(managedProductId);
  const { handleBack } = useProductReturn(`/build/managed-products/${managedProductId}`);
  const canOpenSubmissionDetail = useCan("feedbucket:widgets:view");
  const canUpdateSubmission = useCan("feedbucket:submissions:update");
  const canDeleteSubmission = useCan("feedbucket:submissions:delete");
  const canRouteToIntake = useCan("feedbucket:submissions:manage");
  const canCapture = useCan("feedbucket:submissions:manage");
  const intakeRouting = useRouteToIntake();

  const [captureOpen, setCaptureOpen] = useState(false);
  const [feedbucketOpen, setFeedbucketOpen] = useState(false);

  const filterState = useProductFeedbackFilters(managedProductId);
  const {
    listFilters,
    searchInputRef,
    page,
    selected,
    setSelected,
    queryParams,
    bulkFilters,
    dateRangeReversed,
    isFiltered,
    handlePageChange,
    handleClearSelection,
  } = filterState;

  const { data, isLoading, isError, error, refetch } =
    useFeedbucketSubmissions(queryParams);
  const { data: facetsData } = useFeedbucketSubmissionFacets({ managedProductId });
  const { data: crmOrgsData } = useCrmOrganizationsForPicker();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const rows = useMemo(() => data?.data ?? [], [data]);
  const visibleRows = useMemo(
    () => (dateRangeReversed ? [] : rows),
    [dateRangeReversed, rows],
  );
  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );
  const selectionEnabled = canUpdateSubmission || canDeleteSubmission;

  const openSubmissionPane = useCallback(
    (row: SubmissionRow) => filterState.handleOpenSubmission(row.id),
    [filterState],
  );
  const handleOpenFocused = useCallback(
    (index: number) => {
      const row = visibleRows[index];
      if (row) openSubmissionPane(row);
    },
    [visibleRows, openSubmissionPane],
  );
  const feedbackColumns = useMemo(
    () =>
      buildCraftedFeedbackColumns({
        canRouteToIntake,
        onRouteToIntake: intakeRouting.handleRouteToIntake,
      }),
    [canRouteToIntake, intakeRouting.handleRouteToIntake],
  );

  useBuildListKeyboard({
    itemCount: visibleRows.length,
    onOpen: handleOpenFocused,
    onEdit: handleOpenFocused,
    onClearSelection: handleClearSelection,
    searchInputRef,
    enabled: true,
  });

  const renderMobileCard = useCallback(
    (row: SubmissionRow) => <ProductFeedbackMobileCard row={row} />,
    [],
  );
  const getSubmissionRowLabel = useCallback(
    (row: SubmissionRow): string => row.message.slice(0, 80),
    [],
  );
  const getSubmissionRowKey = useCallback((row: SubmissionRow) => row.id, []);
  const handleOpenCapture = useCallback(() => setCaptureOpen(true), []);
  const handleOpenFeedbucket = useCallback(() => setFeedbucketOpen(true), []);

  const feedbackEmptyState = useMemo(
    () =>
      isFiltered ? (
        <EmptyState
          illustration={<EmptyInboxIllustration className="h-24 w-24" />}
          title={dateRangeReversed ? "End date is before the start date" : "No feedback matches your filters"}
          description={dateRangeReversed ? "Choose a start date on or before the end date." : "Try adjusting or clearing your filters."}
          action={{ label: "Clear filters", onClick: listFilters.clearAll }}
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <EmptyState
          illustration={<EmptyInboxIllustration className="h-24 w-24" />}
          title="No feedback submissions"
          description="Submissions from widgets linked to this product will appear here."
          className={CONTENT_FILL_PANEL}
        />
      ),
    [isFiltered, dateRangeReversed, listFilters.clearAll],
  );

  if (productQuery.isSuccess && productQuery.data === null) return <ManagedProductNotFound />;

  return (
    <>
      <PageWrapper
        title="Feedback"
        subtitle="Inbox for widgets and captures linked to this product"
        onBack={handleBack}
        contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
        actions={
          canCapture ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleOpenFeedbucket}>
                Collect via Feedbucket
              </Button>
              <Button type="button" onClick={handleOpenCapture}>
                Capture feedback
              </Button>
            </div>
          ) : undefined
        }
        filters={
          <ProductFeedbackFilters
            filterState={filterState}
            facetsData={facetsData}
            crmOrgsData={crmOrgsData}
          />
        }
      >
        {selectedIds.length > 0 ? (
          <SubmissionBulkToolbar
            selectedIds={selectedIds}
            filters={bulkFilters}
            onClearSelection={handleClearSelection}
          />
        ) : null}
        <ManagedProductDetailShell>
          <CustomerImpactPanel managedProductId={managedProductId} />
          <ManagedProductDetailPrimarySection>
            <BuildListSurface<SubmissionRow>
              permission="feedbucket:submissions:view"
              rows={visibleRows}
              columns={feedbackColumns}
              isLoading={isLoading}
              isError={isError}
              error={error}
              getRowKey={getSubmissionRowKey}
              onRowClick={openSubmissionPane}
              mobileCard={renderMobileCard}
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total: data?.total ?? 0,
                onPageChange: handlePageChange,
              }}
              tableClassName="flex flex-1 min-h-0 h-full border-0 rounded-none"
              loading={
                <DataTableSkeleton
                  rows={10}
                  headers={FEEDBACK_SKELETON_HEADERS}
                  mobileCards
                />
              }
              empty={feedbackEmptyState}
              rowClassName={resolveRowClassName}
              selection={
                selectionEnabled
                  ? {
                      selected,
                      onChange: setSelected,
                      getRowLabel: getSubmissionRowLabel,
                    }
                  : undefined
              }
              onRetry={handleRetry}
            />
          </ManagedProductDetailPrimarySection>
        </ManagedProductDetailShell>
      </PageWrapper>
      <ProductFeedbackDialogs
        managedProductId={managedProductId}
        filterState={filterState}
        rows={rows}
        canCapture={canCapture}
        canOpenSubmissionDetail={canOpenSubmissionDetail}
        captureOpen={captureOpen}
        feedbucketOpen={feedbucketOpen}
        onCaptureOpenChange={setCaptureOpen}
        onFeedbucketOpenChange={setFeedbucketOpen}
        intakeRouting={intakeRouting}
      />
    </>
  );
}
