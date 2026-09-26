"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";
import type { BulkJobPage, BulkJobSummary } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import type { CursorPaginationState } from "@/hooks/common/use-cursor-pagination";
import { formatShortDate } from "@/lib/date-utils";

const JOB_STATUS_MAP: Record<string, StatusEntry> = {
  PREVIEWED: { label: "Previewed", tone: "info" },
  COMMITTING: { label: "Committing", tone: "warning" },
  COMMITTED: { label: "Committed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

const COLUMNS: DataTableColumn<BulkJobSummary>[] = [
  {
    key: "reason",
    header: "Job",
    cell: (job) => (
      <Link href={`/hr/employees/reporting-changes/${job.jobId}`} className="line-clamp-2 text-sm text-primary hover:underline">
        {job.jobReason}
      </Link>
    ),
  },
  { key: "status", header: "Status", cell: (job) => <StatusMapBadge status={job.status} map={JOB_STATUS_MAP} /> },
  { key: "rows", header: "Rows", cell: (job) => <span className="font-mono tabular-nums">{job.rowCount}</span> },
  { key: "committed", header: "Committed", cell: (job) => <span className="font-mono tabular-nums">{job.committedCount}</span> },
  { key: "created", header: "Created", cell: (job) => <span className="font-mono text-dense">{formatShortDate(job.createdAt)}</span> },
];

function jobKey(job: BulkJobSummary): string {
  return job.jobId;
}

interface BulkJobsHistoryProps {
  page: BulkJobPage | undefined;
  isLoading: boolean;
  pager: CursorPaginationState;
}

export function BulkJobsHistory({ page, isLoading, pager }: BulkJobsHistoryProps) {
  function handleNext() {
    pager.goNext(page?.nextCursor);
  }

  return (
    <DataTable
      data={page?.items ?? []}
      columns={COLUMNS}
      getRowKey={jobKey}
      isLoading={isLoading}
      minWidth="40rem"
      pagination={{
        mode: "cursor",
        pageSize: 20,
        pageNumber: pager.pageNumber,
        hasMore: Boolean(page?.nextCursor),
        hasPrevious: pager.hasPrevious,
        onNext: handleNext,
        onPrevious: pager.goPrevious,
      }}
    />
  );
}
