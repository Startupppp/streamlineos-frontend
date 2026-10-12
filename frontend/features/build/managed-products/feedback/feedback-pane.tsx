"use client";

import { useCallback, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedbucketSubmission, useUnmarkDuplicate } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ClassifySubmissionSheet } from "./classify-submission-sheet";
import { FeedbackPaneDetail } from "./feedback-pane-detail";
import { MarkDuplicateDialog } from "./mark-duplicate-dialog";
import { LinkToOpportunityDialog } from "./link-to-opportunity-dialog";
import { StatusBadge, TypeBadge } from "./feedback-signal-badges";

interface FeedbackPaneProps {
  submissionId: number;
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDetail?: () => void;
  onOpenTicket?: (ticketId: number, projectId: number) => void;
}

function FeedbackPaneSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}

export function FeedbackPane({ submissionId, managedProductId, open, onOpenChange, onOpenDetail, onOpenTicket }: FeedbackPaneProps) {
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [linkOppOpen, setLinkOppOpen] = useState(false);

  const { data: submission, isLoading } = useFeedbucketSubmission(submissionId);
  const unmarkDuplicate = useUnmarkDuplicate();

  const handleUnmarkDuplicate = useCallback(() => {
    unmarkDuplicate.mutate(
      { submissionId, expectedRevision: submission?.revision },
      {
        onSuccess: () => { toast.success("Duplicate mark removed"); },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }, [submissionId, submission?.revision, unmarkDuplicate]);

  const handleOpenClassify = useCallback(() => setClassifyOpen(true), []);
  const handleOpenDuplicate = useCallback(() => setDuplicateOpen(true), []);
  const handleOpenLinkOpp = useCallback(() => setLinkOppOpen(true), []);

  const title = isLoading ? "Feedback" : (submission?.message ?? "Feedback");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="line-clamp-3 text-pretty text-base leading-snug">
              {title}
            </SheetTitle>
            {submission ? (
              <SheetDescription className="flex flex-wrap items-center gap-1.5">
                <TypeBadge type={submission.type} />
                <StatusBadge status={submission.status} />
              </SheetDescription>
            ) : (
              <SheetDescription>Submission details</SheetDescription>
            )}
          </SheetHeader>
          {isLoading ? (
            <FeedbackPaneSkeleton />
          ) : submission ? (
            <FeedbackPaneDetail
              submission={submission}
              managedProductId={managedProductId}
              unmarkPending={unmarkDuplicate.isPending}
              onClassify={handleOpenClassify}
              onDuplicate={handleOpenDuplicate}
              onUnmark={handleUnmarkDuplicate}
              onLinkOpp={handleOpenLinkOpp}
              onOpenDetail={onOpenDetail}
              onOpenTicket={onOpenTicket}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-8">
              <p className="text-sm text-muted-foreground">Submission not found.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {submission && classifyOpen && (
        <ClassifySubmissionSheet
          submissionId={submissionId}
          currentTheme={submission.theme}
          currentSegment={submission.segment}
          currentSentiment={submission.sentiment}
          currentConsentStatus={submission.consentStatus}
          expectedRevision={submission.revision}
          open={classifyOpen}
          onOpenChange={setClassifyOpen}
        />
      )}
      {duplicateOpen && (
        <MarkDuplicateDialog
          managedProductId={managedProductId}
          submissionId={submissionId}
          expectedRevision={submission?.revision}
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
        />
      )}
      {linkOppOpen && (
        <LinkToOpportunityDialog
          managedProductId={managedProductId}
          submissionId={submissionId}
          open={linkOppOpen}
          onOpenChange={setLinkOppOpen}
        />
      )}
    </>
  );
}
