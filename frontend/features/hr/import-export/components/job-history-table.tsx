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
import { tallyImportRows } from "./import-result-summary";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatShortDate } from "@/lib/date-utils";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useCanState } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";

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
    key: "outcome",
    header: "New · changed · same",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-muted-foreground",
    cell: (row) => (
      <span className="text-xs">
        {row.status === "committed" || row.status === "rolled_back" ? `${row.createdRows} · ${row.updatedRows} · ${row.unchangedRows}` : "—"}
      </span>
    ),
  },
  {
    key: "errorRows",
    header: "Not imported",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-status-danger-ink",
    cell: (row) => <span className="text-xs">{tallyImportRows(row).notImported}</span>,
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

interface ViewErrorsButtonProps {
  jobId: string;
  onView: (jobId: string) => void;
}

function ViewErrorsButton({ jobId, onView }: ViewErrorsButtonProps) {
  function handleClick() {
    onView(jobId);
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleClick}>
      View errors
    </Button>
  );
}

export function JobHistoryTable({ entity }: JobHistoryTableProps) {
  const [errorJobId, setErrorJobId] = useState<string | null>(null);
  const pager = useCursorPager(entity ?? "");
  const importAccess = useCanState("hr:import:manage");
  const { data, isLoading, isError, error, refetch } = useHrImportJobs(entity, { cursor: pager.cursor, limit: 20 });

  const handleViewErrors = useCallback((jobId: string) => {
    setErrorJobId(jobId);
  }, []);

  const handleCloseErrors = useCallback((open: boolean) => {
    if (!open) setErrorJobId(null);
  }, []);

  const jobs = data?.data ?? [];

  const nextCursor = data?.pagination.nextCursor;
  const handleNextPage = useCallback(() => {
    pager.goNext(nextCursor);
  }, [pager, nextCursor]);

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
        tallyImportRows(row).notImported > 0 ? (
          <ViewErrorsButton jobId={row.id} onView={handleViewErrors} />
        ) : null,
    },
  ];

  // FE-47: the read is disabled without hr:import:manage, which would render
  // as "No import history yet".
  if (importAccess === "denied") {
    return <NoPermissionState permission="hr:import:manage" compact />;
  }

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
        isLoading={isLoading || importAccess === "loading"}
        pagination={{
          mode: "cursor",
          pageSize: 20,
          hasMore: data?.pagination.hasMore ?? false,
          hasPrevious: pager.hasPrevious,
          onNext: handleNextPage,
          onPrevious: pager.goPrevious,
        }}
        emptyState={
          <EmptyState
            illustrationPreset="upload"
            title="No import history yet"
            description="Import jobs will appear here once you run one."
            compact
          />
        }
      />

      <JobErrorsSheet
        jobId={errorJobId ?? ""}
        open={!!errorJobId}
        onOpenChange={handleCloseErrors}
      />
    </>
  );
}
