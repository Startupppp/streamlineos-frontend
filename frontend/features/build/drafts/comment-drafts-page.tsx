"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { useMyCommentDrafts, useDeleteCommentDraft, useDeleteAllCommentDrafts } from "@/hooks/api/build/comment-drafts";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-drafts";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import { CommentDraftRow } from "./comment-draft-row";

function DraftsLoadingSkeleton() {
  return (
    <PmPanel solid className="flex-1 min-h-0">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-start gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0 sm:items-center sm:gap-2.5 sm:py-2"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
            <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-full max-w-xs" />
            </div>
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
        </div>
      ))}
    </PmPanel>
  );
}

export function CommentDraftsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useMyCommentDrafts();
  const deleteDraft = useDeleteCommentDraft();
  const deleteAll = useDeleteAllCommentDrafts();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const drafts = useMemo(() => data ?? [], [data]);
  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
    isEmpty: drafts.length === 0,
  });
  const showsContent = pageState.kind === "ready" || pageState.kind === "loading";

  const handleOpenDraft = useCallback(
    (draft: CommentDraftListItem) => {
      const { projectId, projectKey, ticketNumber } = draft.ticket;
      if (!projectId) return;
      router.push(getTicketDetailHref(projectId, projectKey, ticketNumber));
    },
    [router],
  );

  const handleDelete = useCallback(
    (id: number) => {
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

  return (
    <>
      <PageWrapper
        title="Comment Drafts"
        subtitle="Your saved in-progress ticket comments"
        actionsInline
        actions={
          pageState.kind === "ready" && drafts.length > 0 ? (
            <AnimatedIconButton
              icon={TrashIcon}
              variant="outline"
              size="sm"
              className="h-8 w-8 gap-0 px-0 text-destructive hover:text-destructive sm:w-auto sm:gap-1.5 sm:px-3 sm:text-xs"
              onClick={handleOpenDeleteAll}
              aria-label="Clear all"
            >
              <span className="hidden sm:inline">Clear all</span>
            </AnimatedIconButton>
          ) : undefined
        }
      >
        <PmPageShell withGlow={showsContent}>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <PageState
              resolution={pageState}
              loading={<DraftsLoadingSkeleton />}
              onRetry={handleRetry}
              empty={
                <EmptyState
                  illustrationPreset="default"
                  title="No drafts saved"
                  description="Start typing a comment on a ticket and it will be saved here automatically."
                />
              }
            >
              <PmPanel solid className="flex-1 min-h-0 overflow-hidden">
                {drafts.map((draft) => (
                  <CommentDraftRow
                    key={draft.id}
                    draft={draft}
                    onOpen={handleOpenDraft}
                    onDelete={handleDelete}
                  />
                ))}
              </PmPanel>
            </PageState>
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
