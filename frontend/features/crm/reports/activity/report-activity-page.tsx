"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatRelativeTime } from "@/lib/date-utils";
import { useReportDefinitions, useReportRuns } from "@/hooks/api/crm/reporting";
import type { ReportRunLogEntry } from "@/types/crm/reporting";
import { ReportRunSqlDialog } from "./report-run-sql-dialog";

const REPORTING_VIEW_KEY = "crm:reporting:view";
const PAGE_SIZE = 25;
/** Enough to name the reports a page of runs refers to without a second screen. */
const DEFINITION_LOOKUP_LIMIT = 100;

/**
 * What has been run, and what statement was executed.
 *
 * The controller puts this behind `crm:reporting:view` rather than `run`
 * because it is the audit read: somebody reviewing which questions were asked
 * of the CRM should not need the ability to ask them. Until this page existed
 * that separation was theoretical — the endpoint had no caller, so the only way
 * to review a run was to query the table directly, which is the thing an audit
 * surface exists to avoid.
 *
 * Nothing here shows an id. A run names its report and its runner, and a report
 * that has since been deleted says so rather than falling back to a UUID.
 */
export function ReportActivityPage() {
  const [page, setPage] = useState(1);
  const [openRun, setOpenRun] = useState<ReportRunLogEntry | null>(null);

  const runs = useReportRuns({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const definitions = useReportDefinitions({ limit: DEFINITION_LOOKUP_LIMIT, offset: 0 });

  const namesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const definition of definitions.data ?? [])
      map.set(definition.reportDefinitionId, definition.name);
    return map;
  }, [definitions.data]);

  const rows = runs.data ?? [];

  function describeReport(run: ReportRunLogEntry): string {
    if (run.reportDefinitionId === null) return "Ad-hoc question";
    return namesById.get(run.reportDefinitionId) ?? "A report that no longer exists";
  }

  function makeShowSqlHandler(run: ReportRunLogEntry) {
    return () => setOpenRun(run);
  }

  function handleSqlDialogOpenChange(next: boolean) {
    if (!next) setOpenRun(null);
  }

  function handleRetry() {
    void runs.refetch();
  }

  const columns: DataTableColumn<ReportRunLogEntry>[] = [
    {
      key: "createdAt",
      header: "When",
      cell: (run) => (
        <span className="whitespace-nowrap" title={run.createdAt}>
          {formatRelativeTime(run.createdAt)}
        </span>
      ),
    },
    {
      key: "report",
      header: "Report",
      cell: (run) => <span className="truncate">{describeReport(run)}</span>,
    },
    { key: "sourceKey", header: "Read", cell: (run) => run.sourceKey },
    {
      key: "ranBy",
      header: "Ran by",
      /*
        A run with no user is a run the application made on somebody's behalf —
        a schedule, or a background sweep. Saying that is more useful than
        leaving the cell empty, and it is what a null actually means here.
      */
      cell: (run) => run.ranByName ?? (run.ranByUserId === null ? "The system" : "A former member"),
    },
    {
      key: "rowCount",
      header: "Rows",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (run) => (run.rowCount === null ? "—" : run.rowCount),
    },
    {
      key: "durationMs",
      header: "Took",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (run) => (run.durationMs === null ? "—" : `${run.durationMs}ms`),
    },
    {
      key: "sql",
      header: "",
      className: "w-24",
      cell: (run) => (
        <Button variant="ghost" size="sm" className="h-7" onClick={makeShowSqlHandler(run)}>
          Show SQL
        </Button>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Report activity"
      subtitle="Every report this organisation has run, and the statement each one executed."
      backHref="/crm/reports"
      backLabel="Back to reports"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      {runs.access.denied ? (
        <NoPermissionState permission={REPORTING_VIEW_KEY} className="flex-1" />
      ) : runs.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load the run log"
          description={getErrorMessage(runs.error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(run) => run.reportRunId}
          isLoading={runs.isLoading}
          className="flex-1 min-h-0"
          minWidth="880px"
          emptyState={
            <EmptyState
              className="flex-1 min-h-[40vh]"
              illustrationPreset="report"
              title="No reports have been run"
              description="Runs are recorded the moment somebody executes one, whether from the builder or from a saved report."
              access={runs.access}
            />
          }
          pagination={{
            mode: "server",
            page,
            pageSize: PAGE_SIZE,
            /*
              The endpoint returns a page and no total, so the count offered
              here is derived from whether this page came back full. Inventing a
              total would be claiming a number nobody sent.
            */
            total:
              rows.length < PAGE_SIZE
                ? (page - 1) * PAGE_SIZE + rows.length
                : page * PAGE_SIZE + 1,
            onPageChange: setPage,
          }}
        />
      )}

      <ReportRunSqlDialog run={openRun} onOpenChange={handleSqlDialogOpenChange} />
    </PageWrapper>
  );
}
