"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { useFeedbucketSubmissions } from "@/hooks/api/feedbucket";
import { useCan } from "@/hooks/api/access";
import { SubmissionBulkToolbar } from "@/components/shared/submission-bulk-toolbar";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  type SubmissionRow,
  FEEDBACK_SKELETON_HEADERS,
  buildFeedbackColumnsWithActions,
  TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  LINKED_FILTER_OPTIONS,
  DUPLICATE_FILTER_OPTIONS,
  ProductFeedbackMobileCard,
} from "./product-feedback-columns";
import { useRouteFeedbucketToIntake } from "@/hooks/api/build/intake-mutations";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveProductFeedbackSubmissionHref } from "./product-feedback-model";
import { useProductFeedbackFilters, PAGE_SIZE } from "./use-product-feedback-filters";

interface ProductFeedbackPageProps {
  managedProductId: number;
}

export function ProductFeedbackPage({ managedProductId }: ProductFeedbackPageProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const canOpenSubmissionDetail = useCan("feedbucket:widgets:view");
  const canUpdateSubmission = useCan("feedbucket:submissions:update");
  const canDeleteSubmission = useCan("feedbucket:submissions:delete");
  const canRouteToIntake = useCan("feedbucket:submissions:manage");
  const routeToIntake = useRouteFeedbucketToIntake();

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
    assigneeIdValue,
    duplicateValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    handleTypeChange,
    handleStatusChange,
    handleLinkedChange,
    handleAssigneeChange,
    handleDuplicateChange,
    handleDateRangeChange,
    handlePageChange,
    handleClearSelection,
  } = useProductFeedbackFilters(managedProductId);

  const { data, isLoading, isError, error, refetch } = useFeedbucketSubmissions(queryParams);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const rows = data?.data ?? [];

  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );
  const selectionEnabled = canUpdateSubmission || canDeleteSubmission;

  const handleOpenFocused = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return;
      const href = resolveProductFeedbackSubmissionHref(row, managedProductId, canOpenSubmissionDetail);
      if (href === null) return;
      requestLeave(() => router.push(href));
    },
    [rows, managedProductId, canOpenSubmissionDetail, requestLeave, router],
  );

  const handleRouteToIntake = useCallback((row: SubmissionRow) => {
    const projectId = row.widget?.projectId;
    if (!projectId) return;
    routeToIntake.mutate(
      { submissionId: row.id, projectId },
      {
        onSuccess: (result) => {
          if (result.created) toast.success("Routed to Intake");
          else toast.success("Already in Intake");
        },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }, [routeToIntake]);

  const feedbackColumns = useMemo(
    () => buildFeedbackColumnsWithActions({ canRouteToIntake, onRouteToIntake: handleRouteToIntake }),
    [canRouteToIntake, handleRouteToIntake],
  );

  useBuildListKeyboard({
    itemCount: rows.length,
    onOpen: handleOpenFocused,
    onEdit: handleOpenFocused,
    onClearSelection: handleClearSelection,
    searchInputRef,
    enabled: true,
  });

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
    (row: SubmissionRow): string =>
      resolveSubmissionHref(row) === null ? "" : "cursor-pointer",
    [resolveSubmissionHref],
  );

  const renderMobileCard = useCallback((row: SubmissionRow) => <ProductFeedbackMobileCard row={row} />, []);

  const getSubmissionRowLabel = useCallback((row: SubmissionRow): string => row.message.slice(0, 80), []);

  const getSubmissionRowKey = useCallback((row: SubmissionRow) => row.id, []);

  return (
    <PageWrapper
      title="Feedback"
      subtitle="Submissions collected from widgets linked to this product"
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
              active: listFilters.isActive("assigneeId"),
              control: (
                <UserCombobox
                  value={typedAssigneeId ?? ""}
                  onChange={handleAssigneeChange}
                />
              ),
            },
            {
              id: "date-range",
              label: "Date range",
              active: listFilters.isActive("from") || listFilters.isActive("to"),
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
      <PmPageShell>
        <PmSection index={0} className="flex flex-1 min-h-0 flex-col">
          <BuildListSurface<SubmissionRow>
            permission="feedbucket:submissions:view"
            rows={data?.data ?? []}
            columns={feedbackColumns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            getRowKey={getSubmissionRowKey}
            onRowClick={canOpenSubmissionDetail ? handleRowClick : undefined}
            mobileCard={renderMobileCard}
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              onPageChange: handlePageChange,
            }}
            tableClassName="flex flex-1 min-h-0 h-full border-0 rounded-none"
            loading={<DataTableSkeleton rows={10} headers={FEEDBACK_SKELETON_HEADERS} />}
            empty={
              <EmptyState
                illustration={<EmptyInboxIllustration className="h-24 w-24" />}
                title="No feedback submissions"
                description="Submissions from widgets linked to this product will appear here."
                className={CONTENT_FILL_PANEL}
              />
            }
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
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
