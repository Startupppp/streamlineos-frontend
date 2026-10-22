"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
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
const DEFINITION_LOOKUP_LIMIT = 100;

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
