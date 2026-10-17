"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCommitReportingLineBulkJob, useReportingLineBulkJob } from "@/hooks/api/hr/reporting-line-bulk-jobs";
import type { BulkJob } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { BulkJobRowsTable, rowReasonKey, type RowReasonValues } from "./bulk-job-rows-table";
import { BulkJobSummary } from "./bulk-job-summary";
import { BulkCommitConfirmDialog } from "./bulk-commit-confirm-dialog";
import { isRowReasonValid } from "./bulk-reporting-change-schema";

interface BulkCommitPanelProps {
  job: BulkJob;
  onStartOver: () => void;
}

/** Step 3: review the previewed delta, give per-row reasons where needed, confirm, commit. */
export function BulkCommitPanel({ job: previewed, onStartOver }: BulkCommitPanelProps) {
  const pager = useCursorPagination();
  const { data } = useReportingLineBulkJob(previewed.jobId, pager.cursor);
  const job = data ?? previewed;
  const commit = useCommitReportingLineBulkJob();
  const reasonForm = useForm<RowReasonValues>({ defaultValues: { reasons: {} } });
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Rows needing a reason, from every row page seen so far (a page holds ≤ 100).
  const needsReason = useRef(new Set<number>());
  useEffect(() => {
    for (const row of job.rows) if (row.requiresRowReason) needsReason.current.add(row.rowNumber);
  }, [job.rows]);

  const committed = job.status === "COMMITTED" || job.status === "FAILED";
  const affected = job.readyCount + job.warningCount;
  const phrase = job.requiresConfirmation ? job.confirmationPhrase : null;

  function collectRowReasons(): Array<{ rowNumber: number; reason: string }> | null {
    const reasons: Array<{ rowNumber: number; reason: string }> = [];
    let missing = 0;
    for (const rowNumber of needsReason.current) {
      const reason = reasonForm.getValues(rowReasonKey(rowNumber)) ?? "";
      if (isRowReasonValid(reason)) reasons.push({ rowNumber, reason: reason.trim() });
      else {
        missing += 1;
        reasonForm.setError(rowReasonKey(rowNumber), { message: "Give a reason of at least 10 characters" });
      }
    }
    if (missing > 0) {
      toast.error(`${missing} ${missing === 1 ? "employee needs" : "employees need"} a reason before this can be committed.`);
      return null;
    }
    return reasons;
  }

  function runCommit() {
    const rowReasons = collectRowReasons();
    if (!rowReasons) return;
    commit.mutate(
      {
        jobId: job.jobId,
        ...(phrase ? { confirmationPhrase: phrase } : {}),
        ...(rowReasons.length > 0 ? { rowReasons } : {}),
      },
      {
        onSuccess: (result) => {
          setConfirmOpen(false);
          toast.success(`Changed the reporting line of ${result.committedCount} employees.`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleCommitClick() {
    if (phrase) {
      if (collectRowReasons()) setConfirmOpen(true);
      return;
    }
    runCommit();
  }

  return (
    <div className="flex flex-col gap-4">
      <BulkJobSummary job={job} />
      <FormProvider {...reasonForm}>
        <BulkJobRowsTable rows={job.rows} pager={pager} nextRowCursor={job.nextRowCursor} withReasons={!committed} />
      </FormProvider>
      <div className="flex flex-wrap items-center gap-3">
        {committed ? (
          <Button asChild variant="outline">
            <Link href={`/hr/employees/reporting-changes/${job.jobId}`}>Open job details</Link>
          </Button>
        ) : (
          <LoadingButton type="button" isPending={commit.isPending} disabled={affected === 0} onClick={handleCommitClick}>
            Commit {affected} {affected === 1 ? "change" : "changes"}
          </LoadingButton>
        )}
        <Button type="button" variant="ghost" onClick={onStartOver}>
          {committed ? "Start another change" : "Start over"}
        </Button>
      </div>
      {phrase ? (
        <BulkCommitConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          phrase={phrase}
          affected={affected}
          isPending={commit.isPending}
          onConfirm={runCommit}
        />
      ) : null}
    </div>
  );
}
