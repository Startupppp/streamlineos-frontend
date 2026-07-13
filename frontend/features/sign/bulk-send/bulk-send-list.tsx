"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Ban } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignTemplates } from "@/hooks/api/sign/templates";
import { useBulkSendJobs, useCancelBulkSendJob } from "@/hooks/api/sign/bulk-send";
import type { SignBulkSendJob } from "@/types/sign";
import { CreateBulkSendDialog } from "./create-bulk-send-dialog";

const STATUS_VARIANT: Record<SignBulkSendJob["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  validating: "outline",
  running: "secondary",
  completed: "default",
  failed: "destructive",
  cancelled: "destructive",
};

const ACTIVE_STATUSES = new Set<SignBulkSendJob["status"]>(["pending", "validating", "running"]);

function BulkSendJobRow({ job }: { job: SignBulkSendJob }) {
  const cancel = useCancelBulkSendJob();

  async function handleCancel() {
    try {
      await cancel.mutateAsync(job.id);
      toast.success("Job cancelled");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">Job #{job.id}</p>
          <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {job.successCount}/{job.totalCount} sent · {job.failedCount} failed
        </p>
      </div>
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
  const { data: templates } = useSignTemplates();
  const { data: jobs, isLoading, isError, refetch } = useBulkSendJobs();
  const hasPublished = (templates ?? []).some((t) => t.status === "published");

  return (
    <PageWrapper
      title="Bulk Send"
      subtitle="Send one template to a list of people via CSV"
      actions={
        <Button onClick={() => setCreateOpen(true)} disabled={!hasPublished}>
          <Plus className="size-4" />
          New bulk send
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load bulk send jobs" onRetry={() => void refetch()} />
      ) : !jobs || jobs.length === 0 ? (
        <div className="flex flex-1 h-full flex-col items-center justify-center gap-4 text-center">
          <IllustrationImage name="empty-upload" className="h-40 w-40" />
          <div>
            <p className="font-medium text-foreground">{hasPublished ? "No bulk send jobs yet" : "Publish a template first"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasPublished
                ? "Upload a CSV of recipients to send one template to everyone at once."
                : "Bulk send requires a published single-signer template. Save an envelope as a template, then publish it."}
            </p>
          </div>
          {hasPublished && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New bulk send
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <BulkSendJobRow key={job.id} job={job} />
          ))}
        </div>
      )}
      <CreateBulkSendDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
