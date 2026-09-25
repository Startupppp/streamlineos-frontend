"use client";

import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { ReportingRowStatusBadge } from "@/components/hr/reporting-lines/reporting-status-badge";
import type { BulkJobRow } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import type { CursorPaginationState } from "@/hooks/common/use-cursor-pagination";

export interface RowReasonValues {
  /** Keyed `r<rowNumber>`: a numeric path segment would make react-hook-form build an array. */
  reasons: Record<string, string>;
}

export function rowReasonKey(rowNumber: number): `reasons.r${number}` {
  return `reasons.r${rowNumber}`;
}

function RowReasonCell({ row }: { row: BulkJobRow }) {
  const { register, formState } = useFormContext<RowReasonValues>();
  const errorId = useId();
  if (!row.requiresRowReason) return <span className="text-xs text-muted-foreground">Not needed</span>;
  const message = formState.errors.reasons?.[`r${row.rowNumber}`]?.message;
  return (
    <span className="flex flex-col gap-1">
      <Input
        {...register(rowReasonKey(row.rowNumber))}
        aria-label={`Reason for ${row.employee?.name ?? row.employeeEmail}`}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        placeholder="Why (10+ characters)"
        className="min-w-48"
      />
      {message ? (
        <span id={errorId} className="text-micro text-destructive">
          {message}
        </span>
      ) : null}
    </span>
  );
}

function EmployeeCell({ row }: { row: BulkJobRow }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium">{row.employee?.name ?? row.employeeEmail}</span>
      {row.employee ? <span className="truncate text-micro text-muted-foreground">{row.employeeEmail}</span> : null}
    </span>
  );
}

function ChangeCell({ row }: { row: BulkJobRow }) {
  return (
    <span className="text-sm">
      {row.currentPrimary?.name ?? "No manager"} <span aria-hidden="true">→</span>
      <span className="sr-only">to</span> <span className="font-medium">{row.requestedPrimary?.name ?? "Unchanged"}</span>
    </span>
  );
}

function StatusCell({ row }: { row: BulkJobRow }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <ReportingRowStatusBadge status={row.status} className="w-fit" />
      {row.codes.length > 0 ? <span className="font-mono text-micro text-muted-foreground">{row.codes.join(", ")}</span> : null}
      {row.message ? <span className="text-micro text-muted-foreground">{row.message}</span> : null}
    </span>
  );
}

const BASE_COLUMNS: DataTableColumn<BulkJobRow>[] = [
  { key: "rowNumber", header: "Row", cell: (row) => <span className="tabular-nums text-muted-foreground">{row.rowNumber}</span> },
  { key: "employee", header: "Employee", cell: (row) => <EmployeeCell row={row} /> },
  { key: "change", header: "Primary manager", cell: (row) => <ChangeCell row={row} /> },
  {
    key: "secondary",
    header: "Additional managers",
    cell: (row) => <span className="text-sm">{row.secondaryChanges.length > 0 ? row.secondaryChanges.join("; ") : "—"}</span>,
  },
  { key: "changesLast24h", header: "Changes in 24h", cell: (row) => <span className="font-mono tabular-nums">{row.changesLast24h}</span> },
  { key: "status", header: "Status", cell: (row) => <StatusCell row={row} /> },
];

const REASON_COLUMN: DataTableColumn<BulkJobRow> = { key: "reason", header: "Reason", cell: (row) => <RowReasonCell row={row} /> };

function rowKey(row: BulkJobRow): number {
  return row.rowNumber;
}

interface BulkJobRowsTableProps {
  rows: BulkJobRow[];
  pager: CursorPaginationState;
  nextRowCursor: string | null;
  /** Render the per-row reason inputs; requires a surrounding `FormProvider<RowReasonValues>`. */
  withReasons?: boolean;
}

/** One page (≤ 100) of a bulk job's rows, walked by the job's own row cursor. */
export function BulkJobRowsTable({ rows, pager, nextRowCursor, withReasons = false }: BulkJobRowsTableProps) {
  function handleNext() {
    pager.goNext(nextRowCursor);
  }

  return (
    <DataTable
      data={rows}
      columns={withReasons ? [...BASE_COLUMNS, REASON_COLUMN] : BASE_COLUMNS}
      getRowKey={rowKey}
      minWidth="56rem"
      pagination={{
        mode: "cursor",
        pageSize: 100,
        pageNumber: pager.pageNumber,
        hasMore: nextRowCursor !== null,
        hasPrevious: pager.hasPrevious,
        onNext: handleNext,
        onPrevious: pager.goPrevious,
      }}
    />
  );
}
