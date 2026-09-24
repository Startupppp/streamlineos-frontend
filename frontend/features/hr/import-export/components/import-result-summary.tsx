"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrImportJob, type HrImportJob } from "@/hooks/api/hr/import-export";
import { getErrorMessage } from "@/lib/get-error-message";

const FAILED_ROWS_SHOWN = 10;

interface ImportResultSummaryProps {
  job: HrImportJob;
  entityLabel: string;
}

function Count({ label, value, tone }: { label: string; value: number; tone: "success" | "neutral" | "danger" }) {
  const styles = {
    success: "border-status-success-rule bg-status-success-surface text-status-success-ink",
    neutral: "border-border bg-muted/40 text-foreground",
    danger: "border-status-danger-rule bg-status-danger-surface text-status-danger-ink",
  } as const;
  return (
    <div className={`rounded-lg border p-3 ${styles[tone]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * What a commit actually did, in words a person can act on. A committed job used to close the wizard with "committed
 * successfully" whatever happened; a job that wrote nothing is FAILED, and rows that failed at commit (an email that
 * matches no employee, say) are listed with their reason, not lost. The sum of the four counts plus the rows that
 * never passed validation is the number of rows in the file.
 */
export function ImportResultSummary({ job, entityLabel }: ImportResultSummaryProps) {
  const failed = job.errorRows;
  const written = job.validRows;
  const skipped = Math.max(0, job.totalRows - written - failed);
  const detail = useHrImportJob(failed > 0 ? job.id : null);
  const failedRows = (detail.data?.errorRows ?? []).slice(0, FAILED_ROWS_SHOWN);
  const nothingWritten = job.status === "failed" || written === 0;

  return (
    <div className="space-y-4">
      {nothingWritten ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nothing was imported</AlertTitle>
          <AlertDescription>No {entityLabel.toLowerCase()} row could be written. The reasons are listed below.</AlertDescription>
        </Alert>
      ) : failed > 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Imported with problems</AlertTitle>
          <AlertDescription>
            {written} {written === 1 ? "row was" : "rows were"} written and {failed} failed. Fix the failed rows and import them again; the rows already written will not be duplicated.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Imported</AlertTitle>
          <AlertDescription>
            {written} {written === 1 ? "row was" : "rows were"} written, {job.unchangedRows} of them already there and unchanged.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Count label="New" value={job.createdRows} tone="success" />
        <Count label="Changed" value={job.updatedRows} tone="success" />
        <Count label="Already there" value={job.unchangedRows} tone="neutral" />
        <Count label="Failed" value={failed} tone="danger" />
      </div>
      {skipped > 0 ? <p className="text-xs text-muted-foreground">{skipped} {skipped === 1 ? "row was" : "rows were"} not imported because {skipped === 1 ? "it" : "they"} did not pass validation.</p> : null}

      {failed > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Failed rows{failedRows.length < failed && failedRows.length > 0 ? ` (first ${failedRows.length} of ${failed})` : ""}
          </p>
          {detail.isLoading ? <Skeleton className="h-16 w-full" /> : null}
          {detail.isError ? <p className="text-xs text-destructive">{getErrorMessage(detail.error)} The failed rows are also listed in the import history.</p> : null}
          {failedRows.map((row) => (
            <div key={row.id} className="rounded-md border border-status-danger-rule bg-status-danger-surface px-3 py-2 text-xs text-status-danger-ink">
              <span className="font-medium">Row {row.rowNumber}</span>
              {" — "}
              {row.error ?? "Failed"}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
