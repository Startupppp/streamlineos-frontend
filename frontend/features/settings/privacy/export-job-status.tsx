"use client";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import { ErrorState } from "@/components/shared/error-state";
import { isExportJobActive, useDownloadGdprExport, useGdprExportJob } from "@/hooks/api/privacy/gdpr";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Queued", tone: "info" },
  running: { label: "Preparing", tone: "info" },
  completed: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
};

interface ExportJobStatusProps {
  jobId: string;
}

export function ExportJobStatus({ jobId }: ExportJobStatusProps) {
  const job = useGdprExportJob(jobId);
  const download = useDownloadGdprExport();

  function handleDownload() {
    if (!job.data) return;
    download.mutate(job.data, {
      onSuccess: () => toast.success("Downloaded your data archive"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleRetry() {
    void job.refetch();
  }

  if (job.isLoading) return <Skeleton className="h-14 w-full rounded-lg" />;
  if (job.isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load the archive status"
        description={getErrorMessage(job.error)}
        error={job.error}
        onRetry={handleRetry}
      />
    );
  }
  if (!job.data) return null;

  const status = STATUS[job.data.status] ?? { label: job.data.status, tone: "neutral" as const };
  const ready = job.data.status === "completed";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-inset px-3 py-2 dark:border-background sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Data archive</span>
          <SemanticBadge tone={status.tone} label={status.label} size="xs" />
        </div>
        <span className="text-xs text-muted-foreground">
          Requested {formatDateTime(job.data.createdAt)}
          {ready && job.data.expiresAt ? ` · available until ${formatDateTime(job.data.expiresAt)}` : ""}
          {isExportJobActive(job.data) ? " · this can take a few minutes" : ""}
        </span>
        {job.data.status === "failed" && job.data.errorMessage ? (
          <span className="text-xs text-destructive">{job.data.errorMessage}</span>
        ) : null}
      </div>
      {ready ? (
        <LoadingButton type="button" size="sm" variant="outline" isPending={download.isPending} onClick={handleDownload}>
          Download
        </LoadingButton>
      ) : null}
    </div>
  );
}
