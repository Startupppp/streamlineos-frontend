"use client";

import { use, useCallback, useState } from "react";
import { Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import {
  useJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
} from "@/hooks/api/accounting";
import { useSubmitJournalApproval } from "@/hooks/api/accounting/core";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { JournalEntryView } from "@/features/accounting/core/journal-entry-view";
import {
  ApproveDialog,
  RejectDialog,
} from "@/features/accounting/core/journal-approve-reject-dialogs";

interface JournalEntryDetailPageProps {
  params: Promise<{ entryId: string }>;
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function JournalEntryDetailPage({ params }: JournalEntryDetailPageProps) {
  const { entryId: entryIdStr } = use(params);
  const entryId = Number.parseInt(entryIdStr, 10);

  const query = useJournalEntry(entryId);
  const entry = query.data;

  const canManageJournal = useCan("accounting:journal:post");
  const canApproveJournal = useCan("accounting:journal:approve");

  const postMutation = usePostJournalEntry(entryId);
  const reverseMutation = useReverseJournalEntry(entryId);
  const submitApprovalMutation = useSubmitJournalApproval(entryId);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const isDraft = entry?.status === "DRAFT";
  const isPosted = entry?.status === "POSTED";
  const isPendingApproval = entry?.status === "PENDING_APPROVAL";
  const isReverseEntry = entry?.sourceEvent === "reverse";
  const canReverse = Boolean(entry) && isPosted && !isReverseEntry;

  function handleRetry(): void {
    void query.refetch();
  }

  const handlePostClick = useCallback(() => {
    setPostDialogOpen(true);
  }, []);

  const handlePostConfirm = useCallback(() => {
    postMutation.mutate(undefined, {
      onSuccess: (result) => {
        setPostDialogOpen(false);
        toast.success(`Entry ${result.entryNumber} posted`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [postMutation]);

  const handleReverseClick = useCallback(() => {
    setReverseDialogOpen(true);
  }, []);

  const handleReverseConfirm = useCallback(() => {
    reverseMutation.mutate(undefined, {
      onSuccess: (result) => {
        setReverseDialogOpen(false);
        const label = result.created ? "Reversing entry created" : "Reversing entry already existed";
        toast.success(`${label}: ${result.entryNumber}`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [reverseMutation]);

  function handleSubmitApproval(): void {
    submitApprovalMutation.mutate(undefined, {
      onSuccess: () => toast.success("Submitted for approval"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleApproveClick(): void {
    setApproveDialogOpen(true);
  }

  function handleRejectClick(): void {
    setRejectDialogOpen(true);
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Journal"
      title={entry ? entry.entryNumber : "Journal entry"}
      subtitle={entry ? formatDate(entry.entryDate) : "Loading journal entry…"}
      backHref="/accounting/journal"
      actions={
        <div className="flex items-center gap-2">
          {canManageJournal && isDraft && (
            <>
              <LoadingButton
                size="sm"
                isPending={submitApprovalMutation.isPending}
                loadingText="Submitting…"
                onClick={handleSubmitApproval}
                variant="outline"
              >
                <Send className="mr-1 h-4 w-4" />
                Submit for approval
              </LoadingButton>
              <Button size="sm" onClick={handlePostClick} disabled={postMutation.isPending}>
                <Send className="mr-1 h-4 w-4" />
                {postMutation.isPending ? "Posting…" : "Post entry"}
              </Button>
            </>
          )}
          {canManageJournal && canReverse && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReverseClick}
              disabled={reverseMutation.isPending}
            >
              <Undo2 className="mr-1 h-4 w-4" />
              Reverse this entry
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {query.isLoading ? (
          <LoadingState variant="form" rows={5} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load journal entry"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : !entry || !Number.isInteger(entryId) ? (
          <ErrorState
            title="Journal entry not found"
            description="This journal entry does not exist or you do not have access to it."
          />
        ) : (
          <JournalEntryView
            entry={entry}
            isPendingApproval={isPendingApproval}
            canApproveJournal={canApproveJournal}
            onApproveClick={handleApproveClick}
            onRejectClick={handleRejectClick}
          />
        )}
      </div>

      <AlertDialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Posting is irreversible. The entry will be locked and recorded in the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={postMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePostConfirm} disabled={postMutation.isPending}>
              {postMutation.isPending ? "Posting…" : "Post entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new journal entry with debits and credits swapped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverseMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverseConfirm}
              disabled={reverseMutation.isPending}
            >
              {reverseMutation.isPending ? "Creating…" : "Create reversing entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApproveDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        entryId={entryId}
      />
      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        entryId={entryId}
      />
    </PageWrapper>
  );
}