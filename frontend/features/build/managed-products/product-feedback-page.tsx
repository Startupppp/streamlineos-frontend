"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { useFeedbucketSubmissions, useFeedbucketSubmissionFacets } from "@/hooks/api/feedbucket";
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
import { useRouteFeedbucketToIntake } from "@/hooks/api/build/intake-mutations";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveProductFeedbackSubmissionHref } from "./product-feedback-model";
import { useProductFeedbackFilters, PAGE_SIZE } from "./use-product-feedback-filters";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";
import { CaptureSubmissionSheet } from "./feedback/capture-submission-sheet";
import { FeedbackPane } from "./feedback/feedback-pane";

interface ProductFeedbackPageProps { managedProductId: number; }

export function ProductFeedbackPage({ managedProductId }: ProductFeedbackPageProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const canOpenSubmissionDetail = useCan("feedbucket:widgets:view");
  const canUpdateSubmission = useCan("feedbucket:submissions:update");
  const canDeleteSubmission = useCan("feedbucket:submissions:delete");
  const canRouteToIntake = useCan("feedbucket:submissions:manage");
  const canCapture = useCan("feedbucket:submissions:manage");
  const routeToIntake = useRouteFeedbucketToIntake();

  const [captureOpen, setCaptureOpen] = useState(false);

  const filterState = useProductFeedbackFilters(managedProductId);
  const {
    listFilters, searchInputRef, page, selected, setSelected, queryParams, bulkFilters,
    typeValue, statusValue, linkedValue, duplicateValue, sourceChannelValue,
    themeValue, sentimentValue, consentStatusValue, linkedToOpportunityValue,
    segmentValue, crmOrgIdValue,
    typedFrom, typedTo, typedAssigneeId, paneSubmissionId, isFiltered,
    handleTypeChange, handleStatusChange, handleLinkedChange, handleAssigneeChange,
    handleDuplicateChange, handleSourceChannelChange, handleThemeChange,
    handleSentimentChange, handleConsentStatusChange, handleLinkedToOpportunityChange,
    handleSegmentChange, handleCrmOrgChange,
    handleDateRangeChange, handlePageChange, handleClearSelection,
  } = filterState;

  const { data, isLoading, isError, error, refetch } = useFeedbucketSubmissions(queryParams);
  const { data: facetsData } = useFeedbucketSubmissionFacets({ managedProductId });
  const { data: crmOrgsData } = useCrmOrganizationsForPicker();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const rows = useMemo(() => data?.data ?? [], [data]);
  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );
  const selectionEnabled = canUpdateSubmission || canDeleteSubmission;

  const themeOptions = useMemo(() => [
    { value: "all", label: "All themes" },
    { value: "untagged", label: "Untagged" },
    ...(facetsData?.themes ?? [])
      .filter((t): t is { value: string; count: number } => t.value !== null)
      .map((t) => ({ value: t.value, label: t.value })),
  ], [facetsData?.themes]);

  const segmentOptions = useMemo(() => [
    { value: "all", label: "All segments" },
    ...(facetsData?.segments ?? [])
      .filter((s): s is { value: string; count: number } => s.value !== null)
      .map((s) => ({ value: s.value, label: s.value })),
  ], [facetsData?.segments]);

  const customerOptions = useMemo(() => [
    { value: "all", label: "All customers" },
    ...(crmOrgsData?.organizations ?? []).map((o) => ({ value: String(o.id), label: o.name })),
  ], [crmOrgsData?.organizations]);

  const handleOpenFocused = useCallback((index: number) => {
    const row = rows[index];
    if (!row) return;
    const href = resolveProductFeedbackSubmissionHref(row, managedProductId, canOpenSubmissionDetail);
    if (href === null) return;
    requestLeave(() => router.push(href));
  }, [rows, managedProductId, canOpenSubmissionDetail, requestLeave, router]);

  const handleRouteToIntake = useCallback((row: SubmissionRow) => {
    const projectId = row.widget?.projectId;
    if (!projectId) return;
    routeToIntake.mutate({ submissionId: row.id, projectId }, {
      onSuccess: (result) => { if (result.created) toast.success("Routed to Intake"); else toast.success("Already in Intake"); },
      onError: (err) => { toast.error(getErrorMessage(err)); },
    });
  }, [routeToIntake]);

  const feedbackColumns = useMemo(
    () => buildFeedbackColumnsWithActions({ canRouteToIntake, onRouteToIntake: handleRouteToIntake }),
    [canRouteToIntake, handleRouteToIntake],
  );

  useBuildListKeyboard({ itemCount: rows.length, onOpen: handleOpenFocused, onEdit: handleOpenFocused, onClearSelection: handleClearSelection, searchInputRef, enabled: true });

  const resolveSubmissionHref = useCallback(
    (row: SubmissionRow) => resolveProductFeedbackSubmissionHref(row, managedProductId, canOpenSubmissionDetail),
    [canOpenSubmissionDetail, managedProductId],
  );

  const handleRowClick = useCallback((row: SubmissionRow) => {
    const href = resolveSubmissionHref(row);
    if (href === null) return;
    requestLeave(() => router.push(href));
  }, [resolveSubmissionHref, requestLeave, router]);

  const resolveRowClassName = useCallback(
    (row: SubmissionRow): string => resolveSubmissionHref(row) === null ? "" : "cursor-pointer",
    [resolveSubmissionHref],
  );

  const renderMobileCard = useCallback((row: SubmissionRow) => <ProductFeedbackMobileCard row={row} />, []);
  const getSubmissionRowLabel = useCallback((row: SubmissionRow): string => row.message.slice(0, 80), []);
  const getSubmissionRowKey = useCallback((row: SubmissionRow) => row.id, []);

  const handleOpenCapture = useCallback(() => setCaptureOpen(true), []);
  const handleCloseFeedbackPane = useCallback((open: boolean) => {
    if (!open) router.replace(`?`, { scroll: false });
  }, [router]);

  const filteredEmptyState = useMemo(() => (
    <EmptyState illustration={<EmptyInboxIllustration className="h-24 w-24" />} title="No feedback matches your filters" description="Try adjusting or clearing your filters." action={{ label: "Clear filters", onClick: listFilters.clearAll }} className={CONTENT_FILL_PANEL} />
  ), [listFilters.clearAll]);

  const emptyState = useMemo(() => (
    <EmptyState illustration={<EmptyInboxIllustration className="h-24 w-24" />} title="No feedback submissions" description="Submissions from widgets linked to this product will appear here." className={CONTENT_FILL_PANEL} />
  ), []);

  return (
    <>
      <PageWrapper
        title="Feedback"
        subtitle="Submissions collected from widgets linked to this product"
        contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
        actions={canCapture ? <Button type="button" onClick={handleOpenCapture}>Capture feedback</Button> : undefined}
        filters={
          <BuildListToolbar
            search={{ value: listFilters.search, onValueChange: listFilters.setSearch, placeholder: "Search feedback…", label: "Search feedback", inputRef: searchInputRef }}
            filters={[
              { id: "type", label: "Type", active: listFilters.isActive("type"),
                control: <BuildFilterSelect label="Type" value={typeValue} onValueChange={handleTypeChange} options={TYPE_FILTER_OPTIONS} /> },
              { id: "status", label: "Status", active: listFilters.isActive("status"),
                control: <BuildFilterSelect label="Status" value={statusValue} onValueChange={handleStatusChange} options={STATUS_FILTER_OPTIONS} /> },
              { id: "sourceChannel", label: "Channel", active: listFilters.isActive("sourceChannel"),
                control: <BuildFilterSelect label="Channel" value={sourceChannelValue} onValueChange={handleSourceChannelChange} options={SOURCE_CHANNEL_FILTER_OPTIONS} /> },
              { id: "theme", label: "Theme", active: listFilters.isActive("theme"),
                control: <BuildFilterSelect label="Theme" value={themeValue} onValueChange={handleThemeChange} options={themeOptions} /> },
              { id: "segment", label: "Segment", active: listFilters.isActive("segment"),
                control: <BuildFilterSelect label="Segment" value={segmentValue} onValueChange={handleSegmentChange} options={segmentOptions} /> },
              { id: "customer", label: "Customer", active: listFilters.isActive("crmOrganizationId"),
                control: <BuildFilterSelect label="Customer" value={crmOrgIdValue} onValueChange={handleCrmOrgChange} options={customerOptions} /> },
              { id: "sentiment", label: "Sentiment", active: listFilters.isActive("sentiment"),
                control: <BuildFilterSelect label="Sentiment" value={sentimentValue} onValueChange={handleSentimentChange} options={SENTIMENT_FILTER_OPTIONS} /> },
              { id: "consentStatus", label: "Consent", active: listFilters.isActive("consentStatus"),
                control: <BuildFilterSelect label="Consent" value={consentStatusValue} onValueChange={handleConsentStatusChange} options={CONSENT_FILTER_OPTIONS} /> },
              { id: "linked", label: "Linked", active: listFilters.isActive("linked"),
                control: <BuildFilterSelect label="Linked" value={linkedValue} onValueChange={handleLinkedChange} options={LINKED_FILTER_OPTIONS} /> },
              { id: "linkedToOpportunity", label: "Opportunity", active: listFilters.isActive("linkedToOpportunity"),
                control: <BuildFilterSelect label="Opportunity" value={linkedToOpportunityValue} onValueChange={handleLinkedToOpportunityChange} options={LINKED_OPP_FILTER_OPTIONS} /> },
              { id: "duplicate", label: "Duplicates", active: listFilters.isActive("duplicate"),
                control: <BuildFilterSelect label="Duplicates" value={duplicateValue} onValueChange={handleDuplicateChange} options={DUPLICATE_FILTER_OPTIONS} /> },
              { id: "assignee", label: "Assignee", active: listFilters.isActive("assigneeId"),
                control: <UserCombobox value={typedAssigneeId ?? ""} onChange={handleAssigneeChange} /> },
              { id: "date-range", label: "Date range", active: listFilters.isActive("from") || listFilters.isActive("to"),
                control: <DateRangePicker from={typedFrom} to={typedTo} onChange={handleDateRangeChange} placeholder="Filter by submission date…" /> },
            ]}
            onClearAll={listFilters.clearAll}
          />
        }
      >
        {selectedIds.length > 0 ? (
          <SubmissionBulkToolbar selectedIds={selectedIds} filters={bulkFilters} onClearSelection={handleClearSelection} />
        ) : null}
        <ManagedProductDetailShell>
          <ManagedProductDetailPrimarySection>
            <BuildListSurface<SubmissionRow>
              permission="feedbucket:submissions:view"
              rows={rows}
              columns={feedbackColumns}
              isLoading={isLoading}
              isError={isError}
              error={error}
              getRowKey={getSubmissionRowKey}
              onRowClick={canOpenSubmissionDetail ? handleRowClick : undefined}
              mobileCard={renderMobileCard}
              pagination={{ mode: "server", page, pageSize: PAGE_SIZE, total: data?.total ?? 0, onPageChange: handlePageChange }}
              tableClassName="flex flex-1 min-h-0 h-full border-0 rounded-none"
              loading={<DataTableSkeleton rows={10} headers={FEEDBACK_SKELETON_HEADERS} mobileCards />}
              empty={isFiltered ? filteredEmptyState : emptyState}
              rowClassName={resolveRowClassName}
              selection={selectionEnabled ? { selected, onChange: setSelected, getRowLabel: getSubmissionRowLabel } : undefined}
              onRetry={handleRetry}
            />
          </ManagedProductDetailPrimarySection>
        </ManagedProductDetailShell>
      </PageWrapper>
      {canCapture && (
        <CaptureSubmissionSheet managedProductId={managedProductId} open={captureOpen} onOpenChange={setCaptureOpen} />
      )}
      {paneSubmissionId !== null && (
        <FeedbackPane submissionId={paneSubmissionId} managedProductId={managedProductId} open={paneSubmissionId !== null} onOpenChange={handleCloseFeedbackPane} />
      )}
    </>
  );
}
