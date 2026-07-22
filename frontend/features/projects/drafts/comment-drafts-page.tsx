"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Trash2Icon, TrashIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { useMyCommentDrafts, useDeleteCommentDraft, useDeleteAllCommentDrafts } from "@/hooks/api/projects/comment-drafts";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { getErrorMessage } from "@/lib/get-error-message";
import { formatTicketKey, getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/features/projects/shared/pm-chrome";

function DraftsLoadingSkeleton() {
  return (
    <PageWrapper title="Comment Drafts" subtitle="Your saved in-progress ticket comments">
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PmPanel solid>
            {[0, 1, 2].map((i) => (
              <div key={i} className={PM_ROW}>
                <Skeleton className="h-4 w-20 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-full max-w-xs" />
                </div>
                <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
              </div>
            ))}
          </PmPanel>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}

export function CommentDraftsPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMyCommentDrafts();
  const deleteDraft = useDeleteCommentDraft();
  const deleteAll = useDeleteAllCommentDrafts();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const drafts = useMemo(() => data ?? [], [data]);

  const handleRowClick = useCallback(
    (ticketId: number, projectId: number | null, projectKey: string | null, ticketNumber: number) => {
      if (!projectId) return;
      const href = getTicketDetailHref(projectId, projectKey, ticketNumber);
      router.push(href);
    },
    [router],
  );

  const handleDelete = useCallback(
    (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteDraft.mutate(id, {
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteDraft],
  );

  const handleDeleteAllConfirm = useCallback(() => {
    deleteAll.mutate(undefined, {
      onSuccess: () => {
        toast.success("All drafts cleared");
        setConfirmDeleteAll(false);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setConfirmDeleteAll(false);
      },
    });
  }, [deleteAll]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenDeleteAll = useCallback(() => setConfirmDeleteAll(true), []);
  const handleCloseDeleteAll = useCallback((open: boolean) => setConfirmDeleteAll(open), []);

  if (isLoading) return <DraftsLoadingSkeleton />;

  if (isError) {
    return (
      <PageWrapper title="Comment Drafts" subtitle="Your saved in-progress ticket comments">
        <PmPageShell withGlow={false}>
          <ErrorState onRetry={handleRetry} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Comment Drafts"
        subtitle="Your saved in-progress ticket comments"
        actions={
          drafts.length > 0 ? (
            <AnimatedIconButton
              icon={TrashIcon}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={handleOpenDeleteAll}
            >
              Clear all
            </AnimatedIconButton>
          ) : undefined
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {drafts.length === 0 ? (
              <EmptyState
                illustrationPreset="default"
                title="No drafts saved"
                description="Start typing a comment on a ticket and it will be saved here automatically."
              />
            ) : (
              <PmPanel solid className="overflow-hidden">
                {drafts.map((draft) => {
                  const ticketKey = formatTicketKey(draft.ticket.projectKey, draft.ticket.ticketNumber, draft.ticket.id);
                  const age = formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true });

                  return (
                    <button
                      key={draft.id}
                      type="button"
                      className={`${PM_ROW} w-full text-left cursor-pointer`}
                      onClick={() =>
                        handleRowClick(
                          draft.ticket.id,
                          draft.ticket.projectId,
                          draft.ticket.projectKey,
                          draft.ticket.ticketNumber,
                        )
                      }
                    >
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-primary/80 min-w-[4.5rem]">
                        {ticketKey}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {draft.ticket.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                          {draft.body}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">
                        {age}
                      </span>
                      <AnimatedIconButton
                        icon={Trash2Icon}
                        size="icon-sm"
                        variant="ghost"
                        iconSize={13}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(draft.id, e)}
                        aria-label={`Delete draft for ${ticketKey}`}
                      />
                    </button>
                  );
                })}
              </PmPanel>
            )}
          </PmSection>
        </PmPageShell>
      </PageWrapper>

      <AlertDialog open={confirmDeleteAll} onOpenChange={handleCloseDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all drafts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {drafts.length} saved comment draft
              {drafts.length !== 1 ? "s" : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                variant="destructive"
                isPending={deleteAll.isPending}
                loadingText="Clearing…"
                onClick={handleDeleteAllConfirm}
              >
                Clear all
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
