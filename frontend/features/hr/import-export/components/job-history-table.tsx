"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useHrImportJobs,
  type HrImportEntity,
  type HrImportJob,
  type HrImportStatus,
} from "@/hooks/api/hr/import-export";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { JobErrorsSheet } from "./job-errors-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatShortDate } from "@/lib/date-utils";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";

interface JobHistoryTableProps {
  entity?: HrImportEntity;
}

const STATUS_BADGE: Record<
  HrImportStatus,
  { label: string; className: string }
> = {
  validating: { label: "Validating", className: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  previewed: { label: "Previewed", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  committing: { label: "Committing", className: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  committed: { label: "Committed", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  rolled_back: { label: "Rolled Back", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  failed: { label: "Failed", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
};

const ENTITY_LABELS: Record<HrImportEntity, string> = {
  employees: "Employees",
  leave_balances: "Leave Balances",
  attendance: "Attendance",
  assets: "Assets",
  document_metadata: "Documents",
};

const COLUMNS: DataTableColumn<HrImportJob>[] = [
  {
    key: "entity",
    header: "Entity",
    cell: (row) => (
      <span className="text-xs font-medium">
        {ENTITY_LABELS[row.entity] ?? row.entity}
      </span>
    ),
  },
  {
    key: "fileName",
    header: "File",
    cell: (row) => (
      <TruncatedText text={row.fileName} className="text-xs text-muted-foreground max-w-[160px]" />
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn(
          "text-micro px-1.5 h-5 font-medium",
          STATUS_BADGE[row.status].className,
        )}
      >
        {STATUS_BADGE[row.status].label}
      </Badge>
    ),
  },
  {
    key: "validRows",
    header: "Valid",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-status-success-ink",
    cell: (row) => <span className="text-xs">{row.validRows}</span>,
  },
  {
    key: "errorRows",
    header: "Errors",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-status-danger-ink",
    cell: (row) => <span className="text-xs">{row.errorRows}</span>,
  },
  {
    key: "createdAt",
    header: "Date",
    cell: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatShortDate(row.createdAt)}
      </span>
    ),
  },
];

export function JobHistoryTable({ entity }: JobHistoryTableProps) {
  const [errorJobId, setErrorJobId] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data, isLoading, isFetching, isError, error, refetch } = useHrImportJobs(entity, { cursor, limit: 20 });

  const handleViewErrors = useCallback((jobId: string) => {
    setErrorJobId(jobId);
  }, []);

  const handleCloseErrors = useCallback((open: boolean) => {
    if (!open) setErrorJobId(null);
  }, []);

  const jobs = data?.data ?? [];

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const columns: DataTableColumn<HrImportJob>[] = [
    ...COLUMNS,
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) =>
        row.errorRows > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-dense px-2"
            onClick={() => handleViewErrors(row.id)}
          >
            View errors
          </Button>
        ) : null,
    },
  ];

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load import history"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <DataTable
        data={jobs}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            illustrationPreset="upload"
            title="No import history yet"
            description="Import jobs will appear here once you run one."
            compact
          />
        }
      />
      {data && (page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
          className="mt-3"
        />
      ) : null}

      <JobErrorsSheet
        jobId={errorJobId ?? ""}
        open={!!errorJobId}
        onOpenChange={handleCloseErrors}
      />
    </>
  );
}
