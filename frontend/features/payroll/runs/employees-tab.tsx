"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRunEmployees } from "@/hooks/api/payroll/run-employees";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { BreakdownSheet } from "./breakdown-sheet";
import type { RunEmployee } from "@/types/payroll/runs";
import { TruncatedText } from "@/components/ui/truncated-text";

const WORKER_TYPE_COLORS: Record<string, string> = {
  EMPLOYEE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  CONTRACTOR: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  CONSULTANT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  INTERN: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  EOR: "bg-muted text-muted-foreground border-border",
};

interface EmployeesTabProps {
  runId: number;
  isLocked?: boolean;
}

const COLUMNS: DataTableColumn<RunEmployee>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => (
      <div className="flex flex-col gap-0.5 min-w-0">
        <TruncatedText text={row.userName} className="text-dense font-medium" />
        <TruncatedText text={row.userEmail} className="text-micro text-muted-foreground" />
      </div>
    ),
  },
  {
    key: "workerType",
    header: "Type",
    cell: (row) => (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border ${
          WORKER_TYPE_COLORS[row.workerType] ?? "bg-muted text-muted-foreground border-border"
        }`}
      >
        {row.workerType}
      </span>
    ),
  },
  {
    key: "gross",
    header: "Gross",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums">{formatMoney(row.gross)}</span>
    ),
  },
  {
    key: "deductions",
    header: "Deductions",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums text-status-danger-ink">
        {row.totalDeductions ? `−${formatMoney(row.totalDeductions)}` : "—"}
      </span>
    ),
  },
  {
    key: "net",
    header: "Net",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums font-medium">
        {formatMoney(row.net)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <span className="text-micro text-muted-foreground capitalize">
        {row.status.toLowerCase().replace(/_/g, " ")}
      </span>
    ),
  },
];

export function EmployeesTab({ runId, isLocked }: EmployeesTabProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [selectedRunEmployeeId, setSelectedRunEmployeeId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useRunEmployees(runId, { cursor, limit: 20, search: search || undefined });

  function handleRowClick(row: RunEmployee) {
    setSelectedRunEmployeeId(row.id);
  }

  function handleSheetClose() {
    setSelectedRunEmployeeId(null);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setCursor(undefined);
  }

  function handleRetry() {
    void refetch();
  }

  // "No employees in this run — generate payroll to include employees" is an
  // instruction; a failed read must never issue it over a run that already has
  // employees.
  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load this run's employees"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <DataTable
        data={data?.data ?? []}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        minWidth="700px"
        search={{ value: search, onChange: handleSearchChange, placeholder: "Search employees…" }}
        footer={
          data?.pagination.hasMore ? (
            <div className="flex justify-end px-4 py-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setCursor(data.pagination.nextCursor ?? undefined)}
              >
                Load next page
              </button>
            </div>
          ) : undefined
        }
        mobileCard={(row) => (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.userName}</p>
                <p className="text-dense text-muted-foreground truncate">{row.userEmail}</p>
              </div>
              <span className="text-micro text-muted-foreground shrink-0 capitalize">
                {row.status.toLowerCase().replace(/_/g, " ")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-dense">
              <div>
                <p className="text-muted-foreground">Gross</p>
                <p className="font-mono tabular-nums">{formatMoney(row.gross)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ded.</p>
                <p className="font-mono tabular-nums text-status-danger-ink">
                  {row.totalDeductions ? `−${formatMoney(row.totalDeductions)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Net</p>
                <p className="font-mono tabular-nums font-medium">{formatMoney(row.net)}</p>
              </div>
            </div>
          </div>
        )}
        emptyState={
          <EmptyState compact title="No employees in this run" description="Generate payroll to include employees" />
        }
      />

      <BreakdownSheet
        runId={runId}
        runEmployeeId={selectedRunEmployeeId}
        onClose={handleSheetClose}
        isLocked={isLocked}
      />
    </>
  );
}
