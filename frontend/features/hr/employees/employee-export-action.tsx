"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [exportJobId, setExportJobId] = useState<string | null>(null);
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
    const message = getErrorMessage(exportJob.error);
    if (lastNotice.current === `error:${message}`) return;
    lastNotice.current = `error:${message}`;
    toast.error(message);
  }, [exportJob.error]);

  useEffect(() => {
    if (!job || lastNotice.current === `${job.id}:${job.status}`) return;
    if (job.status === "completed") {
      lastNotice.current = `${job.id}:${job.status}`;
      toast.success(`Employee export is ready${job.rowCount === null ? "" : ` (${job.rowCount} rows)`}.`);
    }
    if (job.status === "failed") {
      lastNotice.current = `${job.id}:${job.status}`;
      toast.error(job.errorMessage ?? "Employee export failed. Try again.");
    }
    if (job.status === "expired") {
      lastNotice.current = `${job.id}:${job.status}`;
      toast.info("This employee export expired. Create a new export.");
    }
  }, [job]);

  const startExport = useCallback(() => {
    createExport.mutate(
      { filters, idempotencyKey: randomId() },
      {
        onSuccess: (createdJob) => {
          lastNotice.current = null;
          setExportJobId(createdJob.id);
          toast.success("Employee export queued. You can keep working while it is prepared.");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [createExport, filters]);

  const download = useCallback(() => {
    if (!job || job.status !== "completed") return;
    downloadExport.mutate(job.id, {
      onError: (error) => {
        setExportJobId(null);
        toast.error(getErrorMessage(error));
      },
    });
  }, [downloadExport, job]);

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
        className="h-8 w-full gap-1.5 sm:w-auto"
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
