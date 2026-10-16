"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateMyExportJob, useExportMyData } from "@/hooks/api/privacy/gdpr";
import { getErrorMessage } from "@/lib/get-error-message";
import { ExportJobStatus } from "./export-job-status";
import { RectificationDialog } from "./rectification-dialog";
import { useStoredExportJobId } from "./use-stored-export-job";

/**
 * Self-service data-subject rights on /settings: access (Art. 15, a quick JSON or a
 * full archive built in the background) and rectification (Art. 16). Universal —
 * every route here takes the subject from the token, never from the client.
 */
export function MyDataSection() {
  const exportNow = useExportMyData();
  const createJob = useCreateMyExportJob();
  const [jobId, setJobId] = useStoredExportJobId();
  const [correcting, setCorrecting] = useState(false);

  function handleExportNow() {
    exportNow.mutate(undefined, {
      onSuccess: (result) =>
        result.exportIncomplete.length > 0
          ? toast.warning(`Downloaded your data, but ${result.exportIncomplete.join(", ")} could not be included`)
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
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm" aria-labelledby="my-data-heading">
      <div>
        <h2 id="my-data-heading" className="text-sm font-semibold text-foreground">
          Your data
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Download a copy of the personal data this organisation holds about you, or correct it.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <LoadingButton type="button" variant="outline" isPending={exportNow.isPending} onClick={handleExportNow}>
          Download my data
        </LoadingButton>
        <LoadingButton type="button" variant="outline" isPending={createJob.isPending} onClick={handlePrepareArchive}>
          Prepare full archive
        </LoadingButton>
        <Button type="button" variant="ghost" onClick={handleOpenCorrection}>
          Correct my data
        </Button>
      </div>
      {jobId ? <ExportJobStatus jobId={jobId} /> : null}
      <RectificationDialog open={correcting} onOpenChange={setCorrecting} />
    </section>
  );
}
