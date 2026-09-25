"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrImportJob, type HrImportJob, type HrImportStatus } from "@/hooks/api/hr/import-export";
import { getErrorMessage } from "@/lib/get-error-message";

const FAILED_ROWS_SHOWN = 10;

/** `HrImportService.getJob` ends in `.limit(50)` with no ORDER BY: a job detail never lists more error rows than this. */
export const SERVER_ERROR_ROW_CAP = 50;

const COMMIT_RECORDED: ReadonlySet<HrImportStatus> = new Set(["committed", "failed", "rolled_back"]);

export interface ImportRowTally {
  /** A commit has run, so `validRows` and `errorRows` have been overwritten with what it did. */
  committed: boolean;
  /** Rows the commit wrote (new, changed or already there). Zero until a commit has run. */
  written: number;
  /** Rows that passed validation but failed while being written. */
  failedWhileWriting: number;
  /** Rows that never passed validation, so the commit never tried them. */
  failedValidation: number;
  /** Rows sitting in status 'error' on the server: the most a job detail request can list, sample or not. */
  notImported: number;
}

/**
 * The job's counters mean different things at different stages, which is how a number and a list came to describe
 * different rows. Before a commit (`previewed`), `errorRows` is the rows that failed validation. `commitJob` then
 * OVERWRITES both counters: `validRows` becomes the rows written and `errorRows` only the rows that failed while being
 * written. The rows that failed validation are counted nowhere any more, though their rows stay in status 'error' next
 * to the commit failures; what is left of the file is `totalRows - validRows - errorRows`.
 *
 * `GET /hr/import/jobs/:id` lists both kinds together with nothing to tell them apart, so a list of failed rows can only
 * honestly be counted as `notImported`, never as `errorRows`.
 */
export function tallyImportRows(job: Pick<HrImportJob, "status" | "totalRows" | "validRows" | "errorRows">): ImportRowTally {
  if (!COMMIT_RECORDED.has(job.status)) {
    return { committed: false, written: 0, failedWhileWriting: 0, failedValidation: job.errorRows, notImported: job.errorRows };
  }
  const notImported = Math.max(job.errorRows, job.totalRows - job.validRows);
  return {
    committed: true,
    written: job.validRows,
    failedWhileWriting: job.errorRows,
    failedValidation: notImported - job.errorRows,
    notImported,
  };
}

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
 * successfully" whatever happened; a job that wrote nothing is FAILED, and rows that did not go in (an email that
 * matches no employee, a row that never passed validation) are listed with their reason, not lost. The four counts
 * plus the rows that never passed validation are the number of rows in the file.
 *
 * The list is every row the server holds in error, so it is counted as "not imported" (failed while being written PLUS
 * failed validation) and never as the "Failed" card, which is only the first of the two. The server sends at most
 * `SERVER_ERROR_ROW_CAP` of them, unordered; the heading says how many are shown of how many there are.
 */
export function ImportResultSummary({ job, entityLabel }: ImportResultSummaryProps) {
  const { written, failedWhileWriting: failed, failedValidation: skipped, notImported } = tallyImportRows(job);
  const detail = useHrImportJob(notImported > 0 ? job.id : null);
  const received = detail.data?.errorRows ?? [];
  const failedRows = received.slice(0, FAILED_ROWS_SHOWN);
  const total = Math.max(notImported, received.length);
  const listing = detail.data !== undefined && failedRows.length < total ? `showing ${failedRows.length} of ${total}` : `${total}`;
  const serverCapped = received.length >= SERVER_ERROR_ROW_CAP && received.length < total;
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
            {written} {written === 1 ? "row was" : "rows were"} written and {failed} failed while being written. Fix the failed rows and import them again; the rows already written will not be duplicated.
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
        <Count label="Failed to write" value={failed} tone="danger" />
      </div>
      {skipped > 0 ? <p className="text-xs text-muted-foreground">{skipped} {skipped === 1 ? "row was" : "rows were"} not imported because {skipped === 1 ? "it" : "they"} did not pass validation.</p> : null}

      {notImported > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Rows not imported ({listing})</p>
          {failed > 0 && skipped > 0 ? <p className="text-xs text-muted-foreground">Rows that failed while being written and rows that did not pass validation are listed together, in no particular order.</p> : null}
          {detail.isLoading ? <Skeleton className="h-16 w-full" /> : null}
          {detail.isError ? <p className="text-xs text-destructive">{getErrorMessage(detail.error)} The rows not imported are also listed in the import history.</p> : null}
          {failedRows.map((row) => (
            <div key={row.id} className="rounded-md border border-status-danger-rule bg-status-danger-surface px-3 py-2 text-xs text-status-danger-ink">
              <span className="font-medium">Row {row.rowNumber}</span>
              {" — "}
              {row.error ?? "Failed"}
            </div>
          ))}
          {serverCapped ? <p className="text-xs text-muted-foreground">The server sends at most {SERVER_ERROR_ROW_CAP} of these rows, so the other {total - received.length} cannot be shown.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
