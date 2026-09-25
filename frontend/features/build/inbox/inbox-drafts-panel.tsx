"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import {
  useMyCommentDrafts,
  useDeleteCommentDraft,
  useDeleteAllCommentDrafts,
} from "@/hooks/api/build/comment-drafts";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-drafts";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { CommentDraftRow } from "@/features/build/drafts/comment-draft-row";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";

const DRAFTS_RENDER_LIMIT = 100;

function DraftsPanelSkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-start gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function InboxDraftsPanel() {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const { data, isLoading, isError, error, refetch } = useMyCommentDrafts();
  const deleteDraft = useDeleteCommentDraft();
  const deleteAll = useDeleteAllCommentDrafts();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const allDrafts = useMemo(() => data ?? [], [data]);
  const drafts = useMemo(() => allDrafts.slice(0, DRAFTS_RENDER_LIMIT), [allDrafts]);

  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
    isEmpty: allDrafts.length === 0,
  });

  const handleOpenDraft = useCallback(
    (draft: CommentDraftListItem) => {
      const { projectId, projectKey, ticketNumber } = draft.ticket;
      if (!projectId) return;
      requestLeave(() =>
        router.push(getTicketDetailHref(projectId, projectKey, ticketNumber)),
      );
    },
    [requestLeave, router],
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

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenDeleteAll = useCallback(() => setConfirmDeleteAll(true), []);

  const handleCloseDeleteAll = useCallback((open: boolean) => {
    setConfirmDeleteAll(open);
  }, []);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="text-sm font-medium">Comment Drafts</span>
        {pageState.kind === "ready" && allDrafts.length > 0 ? (
          <AnimatedIconButton
            icon={TrashIcon}
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            onClick={handleOpenDeleteAll}
            aria-label="Clear all drafts"
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide">
        <PageState
          resolution={pageState}
          loading={<DraftsPanelSkeleton />}
          onRetry={handleRetry}
          compact
          className="min-h-full w-full flex-1"
          empty={
            <EmptyState
              illustrationPreset="default"
              title="No drafts saved"
              description="Start typing a comment on a ticket and it will be saved here automatically."
              compact
              className="min-h-full w-full flex-1 rounded-lg border-dashed p-4"
            />
          }
        >
          <div>
            {drafts.map((draft) => (
              <CommentDraftRow
                key={draft.id}
                draft={draft}
                onOpen={handleOpenDraft}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </PageState>
      </div>

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={handleCloseDeleteAll}
        title="Clear all drafts?"
        description={`Permanently delete all ${allDrafts.length} saved comment draft${allDrafts.length !== 1 ? "s" : ""}. This cannot be undone.`}
        confirmLabel="Clear all"
        destructive
        isPending={deleteAll.isPending}
        onConfirm={handleDeleteAllConfirm}
      />
    </>
  );
}
