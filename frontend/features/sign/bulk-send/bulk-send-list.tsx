"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignTemplates } from "@/hooks/api/sign/templates";
import { useBulkSendJobs, useCancelBulkSendJob } from "@/hooks/api/sign/bulk-send";
import type { SignBulkSendJob } from "@/types/sign";
import { CreateBulkSendDialog } from "./create-bulk-send-dialog";
import { BulkSendJobSheet } from "./bulk-send-job-sheet";

const STATUS_VARIANT: Record<SignBulkSendJob["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  validating: "outline",
  running: "secondary",
  completed: "default",
  failed: "destructive",
  cancelled: "destructive",
};

const ACTIVE_STATUSES = new Set<SignBulkSendJob["status"]>(["pending", "validating", "running"]);

interface BulkSendJobRowProps {
  job: SignBulkSendJob;
  templateName?: string;
  onOpen: (job: SignBulkSendJob) => void;
}

function BulkSendJobRow({ job, templateName, onOpen }: BulkSendJobRowProps) {
  const cancel = useCancelBulkSendJob();

  async function handleCancel() {
    try {
      await cancel.mutateAsync(job.id);
      toast.success("Job cancelled");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleOpen() {
    onOpen(job);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md">
      <button
        type="button"
        onClick={handleOpen}
        className="min-w-0 flex-1 cursor-pointer text-left"
        aria-label={`Open bulk send job ${job.id}`}
      >
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{templateName ?? `Job #${job.id}`}</p>
          <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
          {job.successCount}/{job.totalCount} sent · {job.failedCount} failed
        </p>
      </button>
      {ACTIVE_STATUSES.has(job.status) && (
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <Ban className="size-4" />
          Cancel
        </Button>
      )}
    </div>
  );
}

export function BulkSendList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [openJob, setOpenJob] = useState<SignBulkSendJob | null>(null);
  const { data: templates } = useSignTemplates();
  const { data: jobs, isLoading, isError, refetch } = useBulkSendJobs();
  const hasPublished = (templates ?? []).some((t) => t.status === "published");

  function templateNameFor(job: SignBulkSendJob): string | undefined {
    return (templates ?? []).find((template) => template.id === job.templateId)?.name;
  }

  function handleJobSheetOpenChange(next: boolean) {
    if (!next) setOpenJob(null);
  }

  return (
    <PageWrapper
      title="Bulk Send"
      subtitle="Send one template to a list of people via CSV"
      actions={
        <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" onClick={() => setCreateOpen(true)} disabled={!hasPublished}>
          New bulk send
        </AnimatedIconButton>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load bulk send jobs" onRetry={() => void refetch()} />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          illustration={<IllustrationImage name="empty-upload" className="h-40 w-40" />}
          title={hasPublished ? "No bulk send jobs yet" : "Publish a template first"}
          description={hasPublished ? "Upload a CSV of recipients to send one template to everyone at once." : "Bulk send requires a published single-signer template. Save an envelope as a template, then publish it."}
          action={hasPublished ? { label: "New bulk send", onClick: () => setCreateOpen(true) } : undefined}
          className="flex-1"
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <BulkSendJobRow key={job.id} job={job} templateName={templateNameFor(job)} onOpen={setOpenJob} />
          ))}
        </div>
      )}
      <CreateBulkSendDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BulkSendJobSheet
        jobId={openJob?.id}
        templateName={openJob ? templateNameFor(openJob) : undefined}
        open={openJob !== null}
        onOpenChange={handleJobSheetOpenChange}
      />
    </PageWrapper>
  );
}
