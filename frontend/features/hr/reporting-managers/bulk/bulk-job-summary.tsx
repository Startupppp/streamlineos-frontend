"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadReportingLineBulkJobFailures } from "@/hooks/api/hr/reporting-line-bulk-jobs";
import type { BulkJobSummary as BulkJobSummaryData } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";

/** Rows the job did not (or will not) apply: errors before commit, anything uncommitted after. */
export function unappliedRowCount(job: BulkJobSummaryData): number {
  return job.status === "COMMITTED" || job.status === "FAILED" ? job.rowCount - job.committedCount : job.errorCount;
}

export function FailuresDownloadButton({ jobId }: { jobId: string }) {
  const [pending, setPending] = useState(false);

  async function handleDownload() {
    setPending(true);
    try {
      await downloadReportingLineBulkJobFailures(jobId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <LoadingButton type="button" variant="outline" isPending={pending} onClick={handleDownload}>
      Download failures (CSV)
    </LoadingButton>
  );
}

export function BulkJobSummary({ job }: { job: BulkJobSummaryData }) {
  const committed = job.status === "COMMITTED" || job.status === "FAILED";
  const unapplied = unappliedRowCount(job);
  return (
    <div className="flex flex-col gap-3">
      {/* 2 columns on a phone, 4 from md: StatCardGrid scrolls sideways, which hid "Not applied" at 375. */}
      <div data-testid="bulk-job-summary" className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Rows" value={job.rowCount} icon={Rows3} />
        {committed ? (
          <StatCard label="Committed" value={job.committedCount} icon={CheckCircle2} tone="emerald" />
        ) : (
          <StatCard label="Ready" value={job.readyCount} icon={CheckCircle2} tone="emerald" />
        )}
        <StatCard label="Warnings" value={job.warningCount} icon={AlertTriangle} tone={job.warningCount > 0 ? "amber" : "emerald"} />
        <StatCard
          label={committed ? "Not applied" : "Errors"}
          value={unapplied}
          icon={XCircle}
          tone={unapplied > 0 ? "red" : "emerald"}
        />
      </div>
      {unapplied > 0 ? (
        <div className="flex">
          <FailuresDownloadButton jobId={job.jobId} />
        </div>
      ) : null}
    </div>
  );
}
