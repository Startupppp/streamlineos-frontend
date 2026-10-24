"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSignTemplates } from "@/hooks/api/sign/templates";
import {
  ACTIVE_BULK_SEND_STATUSES,
  useBulkSendJobs,
  useCancelBulkSendJob,
} from "@/hooks/api/sign/bulk-send";
import type { SignBulkSendJob } from "@/types/sign";
import { BulkSendListSkeleton } from "./bulk-send-list-skeleton";
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

const STATUS_LABEL: Record<SignBulkSendJob["status"], string> = {
  pending: "queued",
  validating: "validating",
  running: "sending",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
};

interface BulkSendJobRowProps {
  job: SignBulkSendJob;
  templateName?: string;
  onOpen: (job: SignBulkSendJob) => void;
}

function BulkSendJobRow({ job, templateName, onOpen }: BulkSendJobRowProps) {
  const cancel = useCancelBulkSendJob();
  const isActive = ACTIVE_BULK_SEND_STATUSES.has(job.status);
  const settled = job.successCount + job.failedCount;
  const percent = job.totalCount > 0 ? Math.round((settled / job.totalCount) * 100) : 0;

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
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleOpen}
          className="w-full cursor-pointer text-left"
          aria-label={`Open bulk send job ${job.id}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 text-sm font-medium">
              {templateName ?? `Job #${job.id}`}
            </p>
            <Badge variant={STATUS_VARIANT[job.status]} className="shrink-0">
              {STATUS_LABEL[job.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {job.successCount}/{job.totalCount} sent · {job.failedCount} failed
          </p>
        </button>
        {isActive ? (
          <Progress
            value={percent}
            valueLabel={`${settled} of ${job.totalCount} rows processed`}
            className="mt-2 h-1.5"
          />
        ) : null}
      </div>
      {isActive ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={handleCancel}
          aria-label="Cancel bulk send"
        >
          <Ban className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function BulkSendList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [openJob, setOpenJob] = useState<SignBulkSendJob | null>(null);
  const { data: templates } = useSignTemplates();
  const { data: jobs, isLoading, isFetching, isError, error, refetch, access } = useBulkSendJobs();
  const hasPublished = (templates ?? []).some((t) => t.status === "published");

  const showSkeleton = !jobs && (isLoading || isFetching);

  function templateNameFor(job: SignBulkSendJob): string | undefined {
    return (templates ?? []).find((template) => template.id === job.templateId)?.name;
  }

  function handleJobSheetOpenChange(next: boolean) {
    if (!next) setOpenJob(null);
  }

  async function handleRetry() {
    await refetch();
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  const pageState = usePageState({
    permission: "sign:bulk_send:run",
    isLoading: showSkeleton,
    isError,
    error,
    isEmpty: !jobs?.length,
  });

  return (
    <>
    <PageWrapper
      title="Bulk Send"
      subtitle="Send one template to a list of people via CSV"
      state={pageState}
      loading={<BulkSendListSkeleton />}
      onRetry={handleRetry}
      actions={
        <AnimatedIconButton icon={PlusIcon} onClick={handleOpenCreate} disabled={!hasPublished}>
          New bulk send
        </AnimatedIconButton>
      }
      empty={
        <EmptyState
          access={access}
          illustration={<IllustrationImage name="empty-upload" className="h-40 w-40" />}
          title={hasPublished ? "No bulk send jobs yet" : "Publish a template first"}
          description={hasPublished ? "Upload a CSV of recipients to send one template to everyone at once." : "Bulk send requires a published single-signer template. Save an envelope as a template, then publish it."}
          action={hasPublished ? { label: "New bulk send", onClick: handleOpenCreate } : undefined}
          className="h-full min-h-full flex-1"
        />
      }
    >
      <div className="flex flex-col gap-2">
        {jobs?.map((job) => (
          <BulkSendJobRow key={job.id} job={job} templateName={templateNameFor(job)} onOpen={setOpenJob} />
        ))}
      </div>
    </PageWrapper>
    <CreateBulkSendDialog open={createOpen} onOpenChange={setCreateOpen} />
    <BulkSendJobSheet
      jobId={openJob?.id}
      templateName={openJob ? templateNameFor(openJob) : undefined}
      open={openJob !== null}
      onOpenChange={handleJobSheetOpenChange}
    />
    </>
  );
}
