"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  useHrImportJobs,
  type HrImportEntity,
  type HrImportJob,
  type HrImportStatus,
} from "@/hooks/api/hr/import-export";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { JobErrorsSheet } from "./job-errors-sheet";

interface JobHistoryTableProps {
  entity?: HrImportEntity;
}

const STATUS_BADGE: Record<
  HrImportStatus,
  { label: string; className: string }
> = {
  validating: { label: "Validating", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  previewed: { label: "Previewed", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  committing: { label: "Committing", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  committed: { label: "Committed", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  rolled_back: { label: "Rolled Back", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
};

const ENTITY_LABELS: Record<HrImportEntity, string> = {
  employees: "Employees",
  leave_balances: "Leave Balances",
  attendance: "Attendance",
  assets: "Assets",
  document_metadata: "Documents",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
      <span className="text-xs text-muted-foreground truncate max-w-[160px] block">
        {row.fileName}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-1.5 h-5 font-medium",
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
    className: "text-right tabular-nums text-emerald-700 dark:text-emerald-400",
    cell: (row) => <span className="text-xs">{row.validRows}</span>,
  },
  {
    key: "errorRows",
    header: "Errors",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-red-600 dark:text-red-400",
    cell: (row) => <span className="text-xs">{row.errorRows}</span>,
  },
  {
    key: "createdAt",
    header: "Date",
    cell: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(row.createdAt)}
      </span>
    ),
  },
];

export function JobHistoryTable({ entity }: JobHistoryTableProps) {
  const [errorJobId, setErrorJobId] = useState<string | null>(null);
  const { data, isLoading } = useHrImportJobs(entity);

  const handleViewErrors = useCallback((jobId: string) => {
    setErrorJobId(jobId);
  }, []);

  const handleCloseErrors = useCallback((open: boolean) => {
    if (!open) setErrorJobId(null);
  }, []);

  const jobs = data?.data ?? [];

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
            className="h-6 text-[11px] px-2"
            onClick={() => handleViewErrors(row.id)}
          >
            View errors
          </Button>
        ) : null,
    },
  ];

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

      <JobErrorsSheet
        jobId={errorJobId ?? ""}
        open={!!errorJobId}
        onOpenChange={handleCloseErrors}
      />
    </>
  );
}
