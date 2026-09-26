"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { useFeedbucketSubmissions } from "@/hooks/api/feedbucket";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { SubmissionBulkToolbar } from "@/components/shared/submission-bulk-toolbar";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import {
  type SubmissionRow,
  FILTER_DEFINITIONS,
  FEEDBACK_SKELETON_HEADERS,
  FEEDBACK_COLUMNS,
  TYPE_OPTIONS,
  STATUS_OPTIONS_VALUES,
  TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  LINKED_FILTER_OPTIONS,
  DUPLICATE_FILTER_OPTIONS,
  ProductFeedbackMobileCard,
} from "./product-feedback-columns";
import type { FeedbucketSubmissionFilters } from "@/types/feedbucket";

const PAGE_SIZE = 25;

interface ProductFeedbackPageProps {
  managedProductId: number;
}

function resolveProductFeedbackSubmissionHref(
  row: SubmissionRow,
  managedProductId: number,
  canOpenDetail: boolean,
): string | null {
  const projectId = row.widget?.projectId;
  const owningManagedProductId = row.widget?.managedProductId;
  if (
    !canOpenDetail ||
    !Number.isSafeInteger(row.id) ||
    row.id <= 0 ||
    !Number.isSafeInteger(projectId) ||
    (projectId ?? 0) <= 0 ||
    owningManagedProductId !== managedProductId
  ) {
    return null;
  }
  return `/build/${projectId}/feedbucket/${row.id}`;
}

export function ProductFeedbackPage({ managedProductId }: ProductFeedbackPageProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const canOpenSubmissionDetail = useCan("feedbucket:widgets:view");
  const canUpdateSubmission = useCan("feedbucket:submissions:update");
  const canDeleteSubmission = useCan("feedbucket:submissions:delete");
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");
  const linkedValue = listFilters.value("linked");
  const assigneeIdValue = listFilters.value("assigneeId");
  const duplicateValue = listFilters.value("duplicate");
  const fromValue = listFilters.value("from");
  const toValue = listFilters.value("to");

  const typedType = useMemo(
    () => TYPE_OPTIONS.find((v) => v === typeValue),
    [typeValue],
  );

  const typedStatus = useMemo(
    () => STATUS_OPTIONS_VALUES.find((v) => v === statusValue),
    [statusValue],
  );

  const typedLinked = useMemo(
    () => (linkedValue === "linked" || linkedValue === "unlinked" ? linkedValue : undefined),
    [linkedValue],
  );

  const typedAssigneeId = useMemo(
    () => (assigneeIdValue !== BUILD_FILTER_ALL ? assigneeIdValue : undefined),
    [assigneeIdValue],
  );

  const typedDuplicate = useMemo(
    () => (duplicateValue === "true" || duplicateValue === "false" ? duplicateValue : undefined),
    [duplicateValue],
  );

  const typedFrom = listFilters.isActive("from") ? fromValue : undefined;
  const typedTo = listFilters.isActive("to") ? toValue : undefined;

  const [appliedFilterKey, setAppliedFilterKey] = useState(listFilters.resetKey);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  if (appliedFilterKey !== listFilters.resetKey) {
    setAppliedFilterKey(listFilters.resetKey);
    setPage(1);
    setSelected(new Set());
  }

  const queryParams = useMemo(
    () => ({
      managedProductId,
      page,
      limit: PAGE_SIZE,
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
      ...(typedType ? { type: typedType } : {}),
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLinked ? { linked: typedLinked } : {}),
      ...(typedAssigneeId ? { assigneeId: typedAssigneeId } : {}),
      ...(typedDuplicate ? { duplicate: typedDuplicate } : {}),
      ...(typedFrom ? { from: typedFrom } : {}),
      ...(typedTo ? { to: typedTo } : {}),
    }),
    [
      managedProductId,
      page,
      listFilters.debouncedSearch,
      typedType,
      typedStatus,
      typedLinked,
      typedAssigneeId,
      typedDuplicate,
      typedFrom,
      typedTo,
    ],
  );

  const { data, isLoading, isError, error, refetch } = useFeedbucketSubmissions(queryParams);

  const resolution = usePageState({
    permission: "feedbucket:submissions:view",
    isLoading,
    isError,
    error,
  });

  const handleTypeChange = useCallback(
    (value: string) => listFilters.setValue("type", value),
    [listFilters],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleLinkedChange = useCallback(
    (value: string) => listFilters.setValue("linked", value),
    [listFilters],
  );

  const handleAssigneeChange = useCallback(
    (value: string) => listFilters.setValue("assigneeId", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const handleDuplicateChange = useCallback(
    (value: string) => listFilters.setValue("duplicate", value),
    [listFilters],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      listFilters.setValue("from", range.from);
      listFilters.setValue("to", range.to);
    },
    [listFilters],
  );

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const rows = data?.data ?? [];

  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );
  const selectionEnabled = canUpdateSubmission || canDeleteSubmission;

  const bulkFilters = useMemo<FeedbucketSubmissionFilters>(
    () => ({
      managedProductId,
      ...(typedType ? { type: typedType } : {}),
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLinked ? { linked: typedLinked } : {}),
      ...(typedAssigneeId ? { assigneeId: typedAssigneeId } : {}),
      ...(typedDuplicate ? { duplicate: typedDuplicate } : {}),
      ...(typedFrom ? { from: typedFrom } : {}),
      ...(typedTo ? { to: typedTo } : {}),
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
    }),
    [
      managedProductId,
      typedType,
      typedStatus,
      typedLinked,
      typedAssigneeId,
      typedDuplicate,
      typedFrom,
      typedTo,
      listFilters.debouncedSearch,
    ],
  );

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

  const handleClearSelection = useCallback(() => setSelected(new Set()), []);

  useBuildListKeyboard({
    itemCount: rows.length,
    onOpen: handleOpenFocused,
    onEdit: handleOpenFocused,
    onClearSelection: handleClearSelection,
    searchInputRef,
    enabled: true,
  });

  const resolveSubmissionHref = useCallback((row: SubmissionRow): string | null => {
    return resolveProductFeedbackSubmissionHref(
      row,
      managedProductId,
      canOpenSubmissionDetail,
    );
  }, [canOpenSubmissionDetail, managedProductId]);

  const handleRowClick = useCallback((row: SubmissionRow) => {
    const href = resolveSubmissionHref(row);
    if (href === null) return;
    requestLeave(() => router.push(href));
  }, [resolveSubmissionHref, requestLeave, router]);

  const resolveRowClassName = useCallback((row: SubmissionRow): string => {
    return resolveSubmissionHref(row) === null ? "" : "cursor-pointer";
  }, [resolveSubmissionHref]);

  const renderMobileCard = useCallback(
    (row: SubmissionRow) => <ProductFeedbackMobileCard row={row} />,
    [],
  );

  const getSubmissionRowLabel = useCallback((row: SubmissionRow): string => row.message.slice(0, 80), []);

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
          <PageState
            resolution={resolution}
            loading={<DataTableSkeleton rows={10} headers={FEEDBACK_SKELETON_HEADERS} />}
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={data?.data ?? []}
              columns={FEEDBACK_COLUMNS}
              getRowKey={(row) => row.id}
              onRowClick={canOpenSubmissionDetail ? handleRowClick : undefined}
              mobileCard={renderMobileCard}
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total: data?.total ?? 0,
                onPageChange: handlePageChange,
              }}
              className="flex flex-1 min-h-0 h-full border-0 rounded-none"
              emptyState={
                <EmptyState
                  illustration={<EmptyInboxIllustration className="h-24 w-24" />}
                  title="No feedback submissions"
                  description="Submissions from widgets linked to this product will appear here."
                  className={PM_FILL_PANEL}
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
            />
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
