"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ReportFiltersBar } from "@/features/support/reports/report-filters";
import { ExportCsvButton } from "@/features/support/reports/export-csv-button";
import {
  useAutomationPerformanceReport,
  type AutomationPerformanceRow,
  type SupportReportFilters,
} from "@/hooks/api/support/reports";

function successRatePct(row: AutomationPerformanceRow): number {
  return row.total > 0 ? (row.succeeded / row.total) * 100 : 0;
}

function SuccessRateBar({ row }: { row: AutomationPerformanceRow }) {
  const pct = successRatePct(row);
  const tone =
    pct >= 90 ? "bg-status-success-fill" : pct >= 60 ? "bg-status-warning-fill" : "bg-status-danger-fill";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-dense tabular-nums text-muted-foreground w-9 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function AutomationPerformancePage() {
  const [filters, setFilters] = useState<SupportReportFilters>({});
  const { data, isLoading, isError, refetch } = useAutomationPerformanceReport(filters);

  const rows = data ?? [];

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<AutomationPerformanceRow>[] = [
    {
      key: "ruleName",
      header: "Rule",
      cell: (row) => <span className="font-medium">{row.ruleName}</span>,
    },
    {
      key: "total",
      header: "Total Runs",
      cell: (row) => row.total,
    },
    {
      key: "succeeded",
      header: "Succeeded",
      cell: (row) => row.succeeded,
    },
    {
      key: "failed",
      header: "Failed",
      cell: (row) => row.failed,
    },
    {
      key: "skipped",
      header: "Skipped",
      cell: (row) => row.skipped,
    },
    {
      key: "successRate",
      header: "Success Rate",
      cell: (row) => <SuccessRateBar row={row} />,
    },
  ];

  const emptyState = (
    <EmptyState
      illustrationPreset="automations"
      title="No automation activity"
      description="No automation rules ran in the selected range."
      compact
      className="min-h-[240px]"
    />
  );

  return (
    <PageWrapper
      title="Automation Performance"
      subtitle="Run outcomes for helpdesk automation rules."
      filters={<ReportFiltersBar filters={filters} onChange={setFilters} />}
      actions={
        <ExportCsvButton
          filename="automation-performance.csv"
          rows={rows.map((row) => ({
            rule: row.ruleName,
            total: row.total,
            succeeded: row.succeeded,
            failed: row.failed,
            skipped: row.skipped,
            successRatePct: successRatePct(row).toFixed(0),
          }))}
        />
      }
    >
      {isError ? (
        <ErrorState title="Could not load automation performance" onRetry={handleRetry} />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={columns}
          getRowKey={(row) => row.ruleId ?? row.total}
          isLoading={isLoading}
          emptyState={emptyState}
          pagination={{ pageSize: 100 }}
          minWidth="640px"
        />
      )}
    </PageWrapper>
  );
}
