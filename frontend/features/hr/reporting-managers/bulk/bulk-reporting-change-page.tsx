"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { useReportingLineBulkJobs } from "@/hooks/api/hr/reporting-line-bulk-jobs";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { BulkReportingChangeWizard } from "./bulk-reporting-change-wizard";
import { BulkJobsHistory } from "./bulk-jobs-history";

export const BULK_CHANGE_TITLE = "Bulk reporting change";
export const BULK_CHANGE_SUBTITLE = "Move many employees to a new reporting manager with a preview, a reason and one confirmation";
export const BULK_JOB_HEADERS = ["Job", "Status", "Rows", "Committed", "Created"];

export function BulkReportingChangeLoading() {
  return <DataTableSkeleton rows={6} headers={BULK_JOB_HEADERS} />;
}

export function BulkReportingChangePage() {
  const pager = useCursorPagination();
  const { data, isLoading, isError, error, refetch } = useReportingLineBulkJobs(pager.cursor);
  const pageState = usePageState({ permission: "hr:reporting-lines:manage", module: "hr", isLoading, isError, error });

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper title={BULK_CHANGE_TITLE} subtitle={BULK_CHANGE_SUBTITLE} contentClassName="flex min-h-0 flex-1 flex-col gap-6">
      <PageState resolution={pageState} loading={<BulkReportingChangeLoading />} onRetry={handleRetry} className="flex-1">
        <BulkReportingChangeWizard />
        <section aria-labelledby="bulk-jobs-heading" className="flex flex-col gap-3">
          <h2 id="bulk-jobs-heading" className="text-sm font-semibold">
            Recent jobs
          </h2>
          <BulkJobsHistory page={data} isLoading={isLoading} pager={pager} />
        </section>
      </PageState>
    </PageWrapper>
  );
}
