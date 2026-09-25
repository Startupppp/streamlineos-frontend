"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportingRowStatusBadge } from "@/components/hr/reporting-lines/reporting-status-badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { downloadBulkOnboardErrorReport, type BulkOnboardErrorReportRow } from "./bulk-onboard-error-report";
import type { BulkOnboardCommit } from "./use-bulk-onboard-flow";

interface BulkOnboardResultPanelProps {
  commit: BulkOnboardCommit;
  /** Rows that did not become employees, from before and during the commit. */
  report: BulkOnboardErrorReportRow[];
  onReset: () => void;
}

function Count({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-bold tabular-nums", className)}>{value}</p>
      <p className="text-dense text-muted-foreground">{label}</p>
    </div>
  );
}

export function BulkOnboardResultPanel({ commit, report, onReset }: BulkOnboardResultPanelProps) {
  const { result } = commit;
  const [downloading, setDownloading] = useState(false);
  const notSubmitted = report.filter((row) => !commit.fileRows.includes(row.row)).length;

  async function handleDownloadReport() {
    setDownloading(true);
    try {
      await downloadBulkOnboardErrorReport(report);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="py-8">
        <div className="mb-6 text-center">
          <div
            className={cn(
              "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full",
              result.created > 0 ? "bg-status-success-surface" : "bg-status-danger-surface",
            )}
          >
            {result.created > 0 ? (
              <CheckCircle2 className="h-7 w-7 text-status-success-ink" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-7 w-7 text-status-danger-ink" aria-hidden="true" />
            )}
          </div>
          <p className="text-base font-semibold">
            {result.created > 0 ? "Bulk onboard complete" : "Onboard finished with errors"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Welcome emails are sent when email delivery is configured. Employees assigned a fallback manager are
            listed under Manager coverage until HR confirms or replaces them.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-8">
          <Count value={result.created} label="Created" className="text-status-success-ink" />
          <Count value={result.skipped} label="Skipped" />
          <Count value={result.failed} label="Failed" className="text-status-danger-ink" />
          <Count value={notSubmitted} label="Not submitted" />
        </div>

        {report.length > 0 ? (
          <div className="mb-4 max-h-48 overflow-auto rounded-lg border border-status-danger-rule bg-status-danger-surface p-3">
            <p className="mb-2 text-xs font-medium text-status-danger-ink">Rows not created</p>
            <ul className="flex flex-col gap-1.5">
              {report.map((row) => (
                <li key={`${row.row}-${row.email}`} className="flex flex-wrap items-center gap-1.5 text-dense text-muted-foreground">
                  <span className="font-medium text-foreground">Row {row.row}</span>
                  <ReportingRowStatusBadge status={row.status} />
                  <span>{row.email}</span>
                  {row.details ? <span>— {row.details}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" className="h-8" onClick={onReset}>
            Onboard more
          </Button>
          {report.length > 0 ? (
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              isPending={downloading}
              onClick={handleDownloadReport}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download error report
            </LoadingButton>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="h-8" asChild>
            <Link href="/hr/employees">View employees</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
