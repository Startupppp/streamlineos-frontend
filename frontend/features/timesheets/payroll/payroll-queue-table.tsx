"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { PayrollSummaryRow } from "./types";

interface PayrollQueueTableProps {
  rows: PayrollSummaryRow[];
  isLoading: boolean;
  hasFilters: boolean;
  selection: Set<string>;
  onSelectionChange: (sel: Set<string | number>) => void;
  onRowClick: (row: PayrollSummaryRow) => void;
  onClearFilters: () => void;
}

function RowStatus({ row }: { row: PayrollSummaryRow }) {
  if (row.hasPendingEntries) {
    return (
      <Badge variant="outline" className="border-status-warning-rule bg-status-warning-surface text-status-warning-ink text-micro">
        Pending entries
      </Badge>
    );
  }
  if (row.totalPayableHours > 0) {
    return (
      <Badge variant="outline" className="border-status-success-rule bg-status-success-surface text-status-success-ink text-micro">
        Ready
      </Badge>
    );
  }
  if (row.exportedHours > 0) {
    return (
      <Badge variant="outline" className="border-border bg-muted text-muted-foreground text-micro">
        Exported
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-micro">
      No hours
    </Badge>
  );
}

export function PayrollQueueTable({
  rows,
  isLoading,
  hasFilters,
  selection,
  onSelectionChange,
  onRowClick,
  onClearFilters,
}: PayrollQueueTableProps) {
  const columns = useMemo<DataTableColumn<PayrollSummaryRow>[]>(
    () => [
      {
        key: "employee",
        header: "Employee",
        cell: (row) => (
          <div className="min-w-0">
            <TruncatedText text={row.userName ?? ""} className="font-medium text-dense" />
            <TruncatedText text={row.userEmail ?? ""} className="text-micro text-muted-foreground" />
          </div>
        ),
        className: "min-w-[160px] max-w-[200px]",
      },
      {
        key: "regularHours",
        header: "Regular",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block">{row.regularHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "overtimeHours",
        header: "Overtime",
        cell: (row) => (
          <span className={`font-mono tabular-nums text-right block ${row.overtimeHours > 0 ? "text-status-warning-ink font-medium" : ""}`}>
            {row.overtimeHours.toFixed(1)}
          </span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "holidayHours",
        header: "Holiday",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block">{row.holidayHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "weekendHours",
        header: "Weekend",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block">{row.weekendHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "leaveDays",
        header: "Leave",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block">{row.leaveDays}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "billableHours",
        header: "Billable",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block">{row.billableHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "nonBillableHours",
        header: "Non-billable",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block">{row.nonBillableHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "totalPayableHours",
        header: "Payable",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block font-semibold">{row.totalPayableHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "exportedHours",
        header: "Exported",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block text-muted-foreground">{row.exportedHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <RowStatus row={row} />,
      },
    ],
    [],
  );

  const emptyState =
    rows.length === 0 && !isLoading ? (
      <EmptyState
        illustration={<EmptyReportIllustration className="h-32 w-32" />}
        title="No payroll data"
        description={
          hasFilters ? undefined : "Select a pay period to see the payroll queue."
        }
        filtersActive={hasFilters}
        onClearFilters={onClearFilters}
      />
    ) : undefined;

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={rows}
      columns={columns}
      getRowKey={(r) => r.userId}
      onRowClick={onRowClick}
      isLoading={isLoading}
      emptyState={emptyState}
      selection={{
        selected: selection,
        onChange: onSelectionChange,
        getRowLabel: (row) => row.userName ?? "",
      }}
      minWidth="900px"
    />
  );
}
