"use client";

import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PermissionGate } from "@/lib/rbac/permission-gate";
import type { ReportingRunResult } from "@/types/crm/reporting";
import { REPORT_QUERY_LIMITS } from "./report-query-limits";
import { buildResultColumns, type ReportResultRow } from "./report-result-columns";
import type { ReportFieldOption } from "./report-source-fields";

interface ReportResultsPanelProps {
  access: PermissionGate;
  result: ReportingRunResult | undefined;
  options: readonly ReportFieldOption[];
  hasRun: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onRetry: () => void;
}

export function ReportResultsPanel({
  access,
  result,
  options,
  hasRun,
  isLoading,
  isError,
  error,
  limit,
  offset,
  onOffsetChange,
  onRetry,
}: ReportResultsPanelProps) {
  const columns = buildResultColumns(result?.columns ?? [], options);

  function handlePageChange(page: number) {
    const next = (page - 1) * limit;
    if (next < 0 || next > REPORT_QUERY_LIMITS.maxOffset) return;
    onOffsetChange(next);
  }

  if (!hasRun)
    return (
      <EmptyState
        access={access}
        className="flex-1 min-h-0"
        illustrationPreset="report"
        title="Nothing has been asked yet"
        description="Pick a source, choose columns, then run the report."
      />
    );

  if (isError)
    return (
      <ErrorState
        className="flex-1"
        title="That report did not run"
        description={getErrorMessage(error)}
        onRetry={onRetry}
      />
    );

  if (isLoading) return <DataTableSkeleton rows={10} columns={Math.max(columns.length, 4)} />;

  const rows: ReportResultRow[] = [...(result?.rows ?? [])];

  if (rows.length === 0 && offset === 0)
    return (
      <EmptyState
        access={access}
        className="flex-1 min-h-0"
        title="No rows matched"
        description="Loosen a filter, or widen the range this report asks about."
      />
    );

  /**
   * The server reports `truncated` rather than a total — it never counts the
   * rows behind the page, because counting them is a second scan of the same
   * table. So the total offered here is "at least this many", which is what
   * makes a next page reachable without claiming a number nobody measured.
   */
  const seen = offset + rows.length;
  const total = result?.truncated ? seen + 1 : seen;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
        {result?.truncated ? (
          <Badge variant="outline">More rows behind this page</Badge>
        ) : null}
      </div>
      <DataTable
        data={rows}
        columns={columns}
        emptyState={
          <EmptyState
            compact
            className="border-0 bg-transparent"
            title="Nothing on this page"
            description="This report ended before here. Go back a page to see its rows."
          />
        }
        getRowKey={(_row, index) => `${offset}-${index}`}
        className="flex-1 min-h-0"
        minWidth="900px"
        pagination={{
          mode: "server",
          page: Math.floor(offset / limit) + 1,
          pageSize: limit,
          total,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}
