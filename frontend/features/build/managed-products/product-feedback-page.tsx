"use client";

import { useState, useCallback, useMemo } from "react";
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
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import {
  type SubmissionRow,
  FILTER_DEFINITIONS,
  FEEDBACK_SKELETON_HEADERS,
  FEEDBACK_COLUMNS,
  TYPE_OPTIONS,
  STATUS_OPTIONS_VALUES,
  TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  ProductFeedbackMobileCard,
} from "./product-feedback-columns";

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
  const canOpenSubmissionDetail = useCan("feedbucket:widgets:view");
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");

  const typedType = useMemo(
    () => TYPE_OPTIONS.find((v) => v === typeValue),
    [typeValue],
  );

  const typedStatus = useMemo(
    () => STATUS_OPTIONS_VALUES.find((v) => v === statusValue),
    [statusValue],
  );

  const [appliedFilterKey, setAppliedFilterKey] = useState(listFilters.resetKey);
  const [page, setPage] = useState(1);
  if (appliedFilterKey !== listFilters.resetKey) {
    setAppliedFilterKey(listFilters.resetKey);
    setPage(1);
  }

  const queryParams = useMemo(
    () => ({
      managedProductId,
      page,
      limit: PAGE_SIZE,
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
      ...(typedType ? { type: typedType } : {}),
      ...(typedStatus ? { status: typedStatus } : {}),
    }),
    [managedProductId, page, listFilters.debouncedSearch, typedType, typedStatus],
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

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

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
    router.push(href);
  }, [resolveSubmissionHref, router]);

  const resolveRowClassName = useCallback((row: SubmissionRow): string => {
    return resolveSubmissionHref(row) === null ? "" : "cursor-pointer";
  }, [resolveSubmissionHref]);

  const renderMobileCard = useCallback(
    (row: SubmissionRow) => <ProductFeedbackMobileCard row={row} />,
    [],
  );

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
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
    >
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
            />
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
