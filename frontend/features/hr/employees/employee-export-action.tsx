"use client";

import { useCallback, useEffect, useRef } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useCreateHrEmployeeExportJob,
  useDownloadHrEmployeeExportJob,
  useHrEmployeeExportJob,
  type HrEmployeeExportFilters,
  type HrExportJobStatus,
} from "@/hooks/api/hr/import-export";
import { getErrorMessage } from "@/lib/get-error-message";
import { randomId } from "@/lib/random-id";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import {
  clearExportJobId,
  saveExportJobId,
  useStoredExportJobId,
} from "@/features/hr/employees/employee-export-job-storage";
import { isApiError } from "@/lib/api-envelope";

interface EmployeeExportActionProps {
  filters: HrEmployeeExportFilters;
}

function exportButtonLabel(
  status: HrExportJobStatus | undefined,
  processedRows: number,
  isCreating: boolean,
  isDownloading: boolean,
  hasStatusError: boolean,
): string {
  if (isCreating) return "Starting export...";
  if (isDownloading) return "Downloading...";
  if (hasStatusError) return "Retry export";
  if (status === "pending") return "Export queued";
  if (status === "running") {
    return processedRows > 0 ? `Exporting ${processedRows}...` : "Exporting...";
  }
  if (status === "completed") return "Download export";
  if (status === "failed" || status === "expired") return "Retry export";
  return "Export";
}

export function EmployeeExportAction({ filters }: EmployeeExportActionProps) {
  // `<orgId>::<userId>`, so the recovered job belongs to this person in this
  // organisation and to nobody else.
  const scope = useOrgStorageScope();
  /**
   * Ticket 04. Recovery is a read of the stored id and nothing else — it never
   * POSTs, so returning to the page cannot create a second export. The id is the
   * only state this button has, and it lives in the store rather than in
   * `useState`, so a reload, a return to the page and an organisation switch all
   * resolve to whatever that scope holds.
   */
  const exportJobId = useStoredExportJobId(scope);
  const lastNotice = useRef<string | null>(null);
  const createExport = useCreateHrEmployeeExportJob();
  const downloadExport = useDownloadHrEmployeeExportJob();
  const exportJob = useHrEmployeeExportJob(exportJobId);
  const job = exportJob.data;
  const isActive =
    !exportJob.isError &&
    (job?.status === "pending" || job?.status === "running");

  useEffect(() => {
    if (!exportJob.error) return;
    // A stored id the server will not serve any more must not nag on every
    // visit. Only "gone" counts: dropping the id on a transient 5xx would
    // abandon an export that is still running.
    const status = isApiError(exportJob.error) ? exportJob.error.status : undefined;
    if (status === 404 || status === 410) {
      clearExportJobId(scope);
    }
    const message = getErrorMessage(exportJob.error);
    if (lastNotice.current === `error:${message}`) return;
    lastNotice.current = `error:${message}`;
    toast.error(message);
  }, [exportJob.error, scope]);

  useEffect(() => {
    if (!job || lastNotice.current === `${job.id}:${job.status}`) return;
    if (job.status === "completed") {
      lastNotice.current = `${job.id}:${job.status}`;
      toast.success(`Employee export is ready${job.rowCount === null ? "" : ` (${job.rowCount} rows)`}.`);
    }
    if (job.status === "failed") {
      lastNotice.current = `${job.id}:${job.status}`;
      clearExportJobId(scope);
      toast.error(job.errorMessage ?? "Employee export failed. Try again.");
    }
    if (job.status === "expired") {
      lastNotice.current = `${job.id}:${job.status}`;
      clearExportJobId(scope);
      toast.info("This employee export expired. Create a new export.");
    }
  }, [job, scope]);

  const startExport = useCallback(() => {
    createExport.mutate(
      { filters, idempotencyKey: randomId() },
      {
        onSuccess: (createdJob) => {
          lastNotice.current = null;
          saveExportJobId(scope, createdJob.id);
          toast.success("Employee export queued. You can keep working while it is prepared.");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [createExport, filters, scope]);

  const download = useCallback(() => {
    if (!job || job.status !== "completed") return;
    downloadExport.mutate(job.id, {
      onError: (error) => {
        clearExportJobId(scope);
        toast.error(getErrorMessage(error));
      },
    });
  }, [downloadExport, job, scope]);

  const handleClick = useCallback(() => {
    if (exportJob.isError) {
      startExport();
      return;
    }
    if (job?.status === "completed") {
      download();
      return;
    }
    startExport();
  }, [download, exportJob, job?.status, startExport]);

  const label = exportButtonLabel(
    job?.status,
    job?.processedRows ?? 0,
    createExport.isPending,
    downloadExport.isPending,
    exportJob.isError,
  );

  return (
    <div className="flex flex-1 items-center sm:flex-none" aria-live="polite">
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 sm:w-auto"
        disabled={isActive || createExport.isPending || downloadExport.isPending}
        onClick={handleClick}
        title={job?.status === "failed" ? (job.errorMessage ?? undefined) : undefined}
      >
        {isActive || createExport.isPending || downloadExport.isPending ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {label}
      </Button>
    </div>
  );
}
