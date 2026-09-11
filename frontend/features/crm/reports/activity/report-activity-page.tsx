"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { RecordList, asRecordValues, type RecordValue } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  REPORT_RUN_LAYOUT,
  reportRunRecordFields,
} from "@/lib/renderer/crm/reports/report-run-layout";
import { getErrorMessage } from "@/lib/get-error-message";
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
 * No table is written here. The columns, their alignment, the absolute
 * timestamp and the mobile card come from `REPORT_RUN_LAYOUT`, and so do the
 * three answers this page gives where there is no name to print — an ad-hoc
 * question, a deleted report, a run the system made on nobody's behalf. Nothing
 * on this page shows an id, and the description is now what guarantees that
 * rather than a cell that remembered to.
 *
 * What is left here is the pair of reads and which run the SQL dialog is about.
 */
export function ReportActivityPage() {
  const [page, setPage] = useState(1);
  const [openRun, setOpenRun] = useState<ReportRunLogEntry | null>(null);

  const layout = useTenantLayout(REPORT_RUN_LAYOUT);

  const runs = useReportRuns({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const definitions = useReportDefinitions({ limit: DEFINITION_LOOKUP_LIMIT, offset: 0 });

  const namesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const definition of definitions.data ?? [])
      map.set(definition.reportDefinitionId, definition.name);
    return map;
  }, [definitions.data]);

  const entries = useMemo(() => runs.data ?? [], [runs.data]);

  const rows = useMemo(
    () => asRecordValues(entries.map((run) => reportRunRecordFields(run, namesById))),
    [entries, namesById],
  );

  function handleRetry() {
    void runs.refetch();
  }

  function handleSqlDialogOpenChange(next: boolean) {
    if (!next) setOpenRun(null);
  }

  /**
   * The statement, which is the one thing about a run the description does not
   * carry. `compiledSql` is the run's payload rather than a column — it is
   * several lines long and belongs in the dialog — so the row hands back the
   * entry it came from and the dialog reads it there.
   */
  const rowActions = useCallback(
    (row: RecordValue) => {
      const run = entries.find((candidate) => candidate.reportRunId === row.reportRunId);
      if (!run) return null;
      return (
        <Button variant="ghost" size="sm" className="h-7" onClick={() => setOpenRun(run)}>
          Show SQL
        </Button>
      );
    },
    [entries],
  );

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
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.reportRunId)}
          actions={rowActions}
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
              entries.length < PAGE_SIZE
                ? (page - 1) * PAGE_SIZE + entries.length
                : page * PAGE_SIZE + 1,
            onPageChange: setPage,
          }}
        />
      )}

      <ReportRunSqlDialog run={openRun} onOpenChange={handleSqlDialogOpenChange} />
    </PageWrapper>
  );
}
