"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Button } from "@/components/ui/button";
import {
  type SubmissionRow,
  FEEDBACK_SKELETON_HEADERS,
  buildFeedbackColumnsWithActions,
  TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  LINKED_FILTER_OPTIONS,
  DUPLICATE_FILTER_OPTIONS,
  SOURCE_CHANNEL_FILTER_OPTIONS,
  SENTIMENT_FILTER_OPTIONS,
  CONSENT_FILTER_OPTIONS,
  LINKED_OPP_FILTER_OPTIONS,
} from "./product-feedback-columns";
import { ProductFeedbackMobileCard } from "./feedback/product-feedback-mobile-card";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { resolveProductFeedbackSubmissionHref } from "./product-feedback-model";
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
import { CaptureSubmissionSheet } from "./feedback/capture-submission-sheet";
import { FeedbackPane } from "./feedback/feedback-pane";
import { FeedbucketCollectDialog } from "./feedback/feedbucket-collect-dialog";
import { RouteToIntakeDialog, useRouteToIntake } from "./feedback/route-to-intake-dialog";

function resolveRowClassName(): string {
  return "cursor-pointer";
}

interface ProductFeedbackPageProps {
  managedProductId: number;
}

export function ProductFeedbackPage({
  managedProductId,
}: ProductFeedbackPageProps) {
  const router = useRouter();
  const productQuery = useManagedProduct(managedProductId);
  const requestLeave = useNavigationLeave();
  const canOpenSubmissionDetail = useCan("feedbucket:widgets:view");
  const canUpdateSubmission = useCan("feedbucket:submissions:update");
  const canDeleteSubmission = useCan("feedbucket:submissions:delete");
  const canRouteToIntake = useCan("feedbucket:submissions:manage");
  const canCapture = useCan("feedbucket:submissions:manage");
  const intakeRouting = useRouteToIntake();
  const { handleRouteToIntake } = intakeRouting;

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
    typeValue,
    statusValue,
    linkedValue,
    duplicateValue,
    linkedToOpportunityValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    paneSubmissionId,
    dateRangeReversed,
    isFiltered,
    appliedSegment,
    appliedTheme,
    appliedCrmOrgId,
    appliedSourceChannel,
    appliedSentiment,
    appliedConsentStatus,
    handleTypeChange,
    handleStatusChange,
    handleLinkedChange,
    handleAssigneeChange,
    handleDuplicateChange,
    handleSourceChannelChange,
    handleThemeChange,
    handleSentimentChange,
    handleConsentStatusChange,
    handleLinkedToOpportunityChange,
    handleSegmentChange,
    handleCrmOrgChange,
    handleDateRangeChange,
    handlePageChange,
    handleClearSelection,
  } = filterState;

  const { data, isLoading, isError, error, refetch } =
    useFeedbucketSubmissions(queryParams);
  const { data: facetsData } = useFeedbucketSubmissionFacets({
    managedProductId,
  });
  const { data: crmOrgsData } = useCrmOrganizationsForPicker();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
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

  const themeOptions = useMemo(
    () => {
      const options = [
        { value: "all", label: "All themes" },
        { value: "untagged", label: "Untagged" },
        ...(facetsData?.themes ?? [])
          .filter((t): t is { value: string; count: number } => t.value !== null)
          .map((t) => ({ value: t.value, label: t.value })),
      ];
      if (appliedTheme && !options.some((option) => option.value === appliedTheme)) {
        options.push({ value: appliedTheme, label: appliedTheme });
      }
      return options;
    },
    [appliedTheme, facetsData?.themes],
  );

  const segmentOptions = useMemo(
    () => {
      const options = [
        { value: "all", label: "All segments" },
        ...(facetsData?.segments ?? [])
          .filter((s): s is { value: string; count: number } => s.value !== null)
          .map((s) => ({ value: s.value, label: s.value })),
      ];
      if (appliedSegment && !options.some((option) => option.value === appliedSegment)) {
        options.push({ value: appliedSegment, label: appliedSegment });
      }
      return options;
    },
    [appliedSegment, facetsData?.segments],
  );

  const customerOptions = useMemo(
    () => {
      const options = [
        { value: "all", label: "All customers" },
        ...(crmOrgsData?.organizations ?? []).map((o) => ({
          value: String(o.id),
          label: o.name,
        })),
      ];
      if (appliedCrmOrgId && !options.some((option) => option.value === appliedCrmOrgId)) {
        options.push({ value: appliedCrmOrgId, label: `Customer ${appliedCrmOrgId}` });
      }
      return options;
    },
    [appliedCrmOrgId, crmOrgsData?.organizations],
  );

  const openSubmissionPane = useCallback(
    (row: SubmissionRow) => listFilters.setValue("submission", String(row.id)),
    [listFilters],
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
      buildFeedbackColumnsWithActions({
        canRouteToIntake,
        onRouteToIntake: handleRouteToIntake,
      }),
    [canRouteToIntake, handleRouteToIntake],
  );

  useBuildListKeyboard({
    itemCount: visibleRows.length,
    onOpen: handleOpenFocused,
    onEdit: handleOpenFocused,
    onClearSelection: handleClearSelection,
    searchInputRef,
    enabled: true,
  });

  const paneRow = useMemo(
    () => rows.find((row) => row.id === paneSubmissionId) ?? null,
    [rows, paneSubmissionId],
  );
  const paneDetailHref = useMemo(
    () =>
      paneRow
        ? resolveProductFeedbackSubmissionHref(paneRow, managedProductId, canOpenSubmissionDetail)
        : null,
    [paneRow, managedProductId, canOpenSubmissionDetail],
  );
  const handleOpenPaneDetail = useCallback(() => {
    if (paneDetailHref !== null) requestLeave(() => router.push(paneDetailHref));
  }, [paneDetailHref, requestLeave, router]);

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
  const handleCloseFeedbackPane = useCallback(
    (open: boolean) => {
      if (!open) listFilters.setValue("submission", "all");
    },
    [listFilters],
  );

  const filteredEmptyState = useMemo(
    () => (
      <EmptyState
        illustration={<EmptyInboxIllustration className="h-24 w-24" />}
        title={dateRangeReversed ? "End date is before the start date" : "No feedback matches your filters"}
        description={dateRangeReversed ? "Choose a start date on or before the end date." : "Try adjusting or clearing your filters."}
        action={{ label: "Clear filters", onClick: listFilters.clearAll }}
        className={CONTENT_FILL_PANEL}
      />
    ),
    [dateRangeReversed, listFilters.clearAll],
  );

  const emptyState = useMemo(
    () => (
      <EmptyState
        illustration={<EmptyInboxIllustration className="h-24 w-24" />}
        title="No feedback submissions"
        description="Submissions from widgets linked to this product will appear here."
        className={CONTENT_FILL_PANEL}
      />
    ),
    [],
  );

  if (productQuery.isSuccess && productQuery.data === null) return <ManagedProductNotFound />;

  return (
    <>
      <PageWrapper
        title="Feedback"
        subtitle="Submissions collected from widgets linked to this product"
        contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
        actions={
          canCapture ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenFeedbucket}
              >
                Collect via Feedbucket
              </Button>
              <Button type="button" onClick={handleOpenCapture}>
                Capture feedback
              </Button>
            </div>
          ) : undefined
        }
        filters={
          <BuildListToolbar
            search={{
              value: listFilters.search,
              onValueChange: listFilters.setSearch,
              placeholder: "Search feedback…",
              label: "Search feedback",
              inputRef: searchInputRef,
            }}
            filters={[
              {
                id: "type",
                label: "Type",
                active: listFilters.isActive("type"),
                control: (
                  <BuildFilterSelect
                    label="Type"
                    value={typeValue}
                    onValueChange={handleTypeChange}
                    options={TYPE_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "status",
                label: "Status",
                active: listFilters.isActive("status"),
                control: (
                  <BuildFilterSelect
                    label="Status"
                    value={statusValue}
                    onValueChange={handleStatusChange}
                    options={STATUS_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "sourceChannel",
                label: "Channel",
                active: appliedSourceChannel !== undefined,
                control: (
                  <BuildFilterSelect
                    label="Channel"
                    value={appliedSourceChannel ?? "all"}
                    onValueChange={handleSourceChannelChange}
                    options={SOURCE_CHANNEL_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "theme",
                label: "Theme",
                active: appliedTheme !== undefined,
                control: (
                  <BuildFilterSelect
                    label="Theme"
                    value={appliedTheme ?? "all"}
                    onValueChange={handleThemeChange}
                    options={themeOptions}
                  />
                ),
              },
              {
                id: "segment",
                label: "Segment",
                active: appliedSegment !== undefined,
                control: (
                  <BuildFilterSelect
                    label="Segment"
                    value={appliedSegment ?? "all"}
                    onValueChange={handleSegmentChange}
                    options={segmentOptions}
                  />
                ),
              },
              {
                id: "customer",
                label: "Customer",
                active: appliedCrmOrgId !== undefined,
                control: (
                  <BuildFilterSelect
                    label="Customer"
                    value={appliedCrmOrgId ?? "all"}
                    onValueChange={handleCrmOrgChange}
                    options={customerOptions}
                  />
                ),
              },
              {
                id: "sentiment",
                label: "Sentiment",
                active: appliedSentiment !== undefined,
                control: (
                  <BuildFilterSelect
                    label="Sentiment"
                    value={appliedSentiment ?? "all"}
                    onValueChange={handleSentimentChange}
                    options={SENTIMENT_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "consentStatus",
                label: "Consent",
                active: appliedConsentStatus !== undefined,
                control: (
                  <BuildFilterSelect
                    label="Consent"
                    value={appliedConsentStatus ?? "all"}
                    onValueChange={handleConsentStatusChange}
                    options={CONSENT_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "linked",
                label: "Linked",
                active: listFilters.isActive("linked"),
                control: (
                  <BuildFilterSelect
                    label="Linked"
                    value={linkedValue}
                    onValueChange={handleLinkedChange}
                    options={LINKED_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "linkedToOpportunity",
                label: "Opportunity",
                active: listFilters.isActive("linkedToOpportunity"),
                control: (
                  <BuildFilterSelect
                    label="Opportunity"
                    value={linkedToOpportunityValue}
                    onValueChange={handleLinkedToOpportunityChange}
                    options={LINKED_OPP_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "duplicate",
                label: "Duplicates",
                active: listFilters.isActive("duplicate"),
                control: (
                  <BuildFilterSelect
                    label="Duplicates"
                    value={duplicateValue}
                    onValueChange={handleDuplicateChange}
                    options={DUPLICATE_FILTER_OPTIONS}
                  />
                ),
              },
              {
                id: "assignee",
                label: "Assignee",
                active: typedAssigneeId !== undefined,
                control: (
                  <UserCombobox
                    value={typedAssigneeId ?? ""}
                    onChange={handleAssigneeChange}
                    placeholder={typedAssigneeId ?? "Select member…"}
                  />
                ),
              },
              {
                id: "date-range",
                label: "Date range",
                active: Boolean(typedFrom || typedTo),
                control: (
                  <DateRangePicker
                    from={typedFrom}
                    to={typedTo}
                    onChange={handleDateRangeChange}
                    placeholder="Filter by submission date…"
                  />
                ),
              },
            ]}
            onClearAll={listFilters.clearAll}
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
              empty={isFiltered ? filteredEmptyState : emptyState}
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
      {canCapture && (
        <CaptureSubmissionSheet
          managedProductId={managedProductId}
          open={captureOpen}
          onOpenChange={setCaptureOpen}
        />
      )}
      {canCapture && feedbucketOpen ? (
        <FeedbucketCollectDialog
          managedProductId={managedProductId}
          open
          onOpenChange={setFeedbucketOpen}
        />
      ) : null}
      {paneSubmissionId !== null && (
        <FeedbackPane
          submissionId={paneSubmissionId}
          managedProductId={managedProductId}
          open={paneSubmissionId !== null}
          onOpenChange={handleCloseFeedbackPane}
          onOpenDetail={paneDetailHref === null ? undefined : handleOpenPaneDetail}
        />
      )}
      {intakeRouting.target ? (
        <RouteToIntakeDialog
          managedProductId={managedProductId}
          submission={intakeRouting.target}
          mutation={intakeRouting.mutation}
          onOpenChange={intakeRouting.handleTargetOpenChange}
        />
      ) : null}
    </>
  );
}
