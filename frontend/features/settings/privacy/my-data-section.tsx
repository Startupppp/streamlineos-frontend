"use client";

import { useState } from "react";
import { Download, FileArchive, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateMyExportJob, useExportMyData } from "@/hooks/api/privacy/gdpr";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { ExportJobStatus } from "./export-job-status";
import { RectificationDialog } from "./rectification-dialog";
import { useStoredExportJobId } from "./use-stored-export-job";


export function MyDataSection() {
  const exportNow = useExportMyData();
  const createJob = useCreateMyExportJob();
  const [jobId, setJobId] = useStoredExportJobId();
  const [correcting, setCorrecting] = useState(false);

  function handleExportNow() {
    exportNow.mutate(undefined, {
      onSuccess: (result) =>
        result.exportIncomplete.length > 0
          ? toast.warning(
              `Downloaded your data, but ${result.exportIncomplete.join(", ")} could not be included`,
            )
          : toast.success("Downloaded your data"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handlePrepareArchive() {
    createJob.mutate(undefined, {
      onSuccess: (job) => {
        setJobId(job.id);
        toast.success("Started preparing your data archive");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleOpenCorrection() {
    setCorrecting(true);
  }

  return (
    <section
      className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
      aria-labelledby="my-data-heading"
    >
      <div className="pb-4">
        <h2
          id="my-data-heading"
          className="text-sm font-semibold text-foreground"
        >
          Your data
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Export a copy or request a correction.
        </p>
      </div>

      <div className="divide-y divide-border border-t border-border">
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <Download className="size-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">Get a copy</p>
              <p className="text-xs leading-snug text-muted-foreground">
                Instant download, or a full archive prepared in the background.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              isPending={exportNow.isPending}
              onClick={handleExportNow}
            >
              Download my data
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              isPending={createJob.isPending}
              onClick={handlePrepareArchive}
            >
              <FileArchive className="size-3.5" aria-hidden="true" />
              Prepare full archive
            </LoadingButton>
          </div>
        </div>

        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <PenLine className="size-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                Correct a detail
              </p>
              <p className="text-xs leading-snug text-muted-foreground">
                Request an update to personal information held about you.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("w-full shrink-0 sm:w-auto")}
            onClick={handleOpenCorrection}
          >
            Correct my data
          </Button>
        </div>
      </div>

      {jobId ? (
        <div className="border-t border-border pt-4">
          <ExportJobStatus jobId={jobId} />
        </div>
      ) : null}

      <RectificationDialog open={correcting} onOpenChange={setCorrecting} />
    </section>
  );
}
