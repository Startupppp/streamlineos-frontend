"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { useReportingLineBulkJob } from "@/hooks/api/hr/reporting-line-bulk-jobs";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { BulkJobSummary } from "./bulk-job-summary";
import { BulkJobRowsTable } from "./bulk-job-rows-table";

export const BULK_JOB_TITLE = "Reporting change job";
export const BULK_JOB_ROW_HEADERS = ["Row", "Employee", "Primary manager", "Additional managers", "Changes in 24h", "Status"];

export function BulkJobDetailLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StatCardGridSkeleton cols={4} />
      <DataTableSkeleton rows={8} headers={BULK_JOB_ROW_HEADERS} />
    </div>
  );
}

export function BulkJobDetailPage({ jobId }: { jobId: string }) {
  const pager = useCursorPagination();
  const { data: job, isLoading, isError, error, refetch } = useReportingLineBulkJob(jobId, pager.cursor);
  const pageState = usePageState({ permission: "hr:reporting-lines:manage", module: "hr", isLoading, isError, error });

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title={BULK_JOB_TITLE}
      subtitle={job?.jobReason}
      backHref="/hr/employees/reporting-changes"
      backLabel="Back to bulk reporting change"
      contentClassName="flex min-h-0 flex-1 flex-col gap-4"
    >
      <PageState resolution={pageState} loading={<BulkJobDetailLoading />} onRetry={handleRetry} className="flex-1">
        {job ? (
          <>
            <BulkJobSummary job={job} />
            <BulkJobRowsTable rows={job.rows} pager={pager} nextRowCursor={job.nextRowCursor} />
          </>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
