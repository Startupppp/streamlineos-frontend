"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TrashIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import {
  useMyCommentDrafts,
  useDeleteCommentDraft,
} from "@/hooks/api/build/comment-drafts";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  buildMyWorkReturnHref,
  getMyWorkTicketHref,
} from "@/features/build/ticket-details/build-ticket-detail-url";
import { CommentDraftRow } from "@/features/build/drafts/comment-draft-row";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-draft-command-cache";

function getDraftResumeHref(
  draft: CommentDraftListItem,
  returnHref: string,
) {
  const projectId = draft.ticket.projectId;
  if (!projectId || projectId <= 0) return null;

  return `${getMyWorkTicketHref(projectId, null, draft.ticket.ticketNumber, returnHref)}&draft=resume`;
}

function DraftsPanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="flex items-start gap-2 border-b border-border/70 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="size-4 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxDraftsPanel() {
  const searchParams = useSearchParams();
  return <DraftsPanelPage key={searchParams.get("draftCursors") ?? "first"} />;
}

function DraftsPanelPage() {
  const searchParams = useSearchParams();
  const pager = useBuildCursorPager(undefined, "draftCursors");
  const returnHref = buildMyWorkReturnHref(searchParams);
  const requestLeave = useNavigationLeave();
  const query = useMyCommentDrafts(pager.cursor);
  const deleteDraft = useDeleteCommentDraft();
  const canDelete = useCan("build:tickets:view");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const page = query.data?.pages[0];
  const drafts = useMemo(() => page?.data ?? [], [page]);
  const selection = useMemo(
    () => selectedIds.filter((id) => drafts.some((draft) => draft.id === id)),
    [selectedIds, drafts],
  );
  const selectedDraftHref = useMemo(() => {
    if (selection.length !== 1) return null;
    const selectedDraft = drafts.find((draft) => draft.id === selection[0]);
    return selectedDraft ? getDraftResumeHref(selectedDraft, returnHref) : null;
  }, [drafts, returnHref, selection]);
  const allSelected = drafts.length > 0 && selection.length === drafts.length;
  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: drafts.length === 0 && !pager.hasPrevious,
  });

  const handleNavigateDraft = useCallback(
    (href: string) => requestLeave(() => window.location.assign(href)),
    [requestLeave],
  );
  const handleSelect = useCallback((id: number, selected: boolean) => {
    setSelectedIds((current) =>
      selected
        ? [...current.filter((item) => item !== id), id]
        : current.filter((item) => item !== id),
    );
  }, []);
  const handleSelectAll = useCallback(
    (checked: boolean | "indeterminate") => {
      setSelectedIds(checked === true ? drafts.map((draft) => draft.id) : []);
    },
    [drafts],
  );
  const handleDelete = useCallback((id: number) => setDeleteIds([id]), []);
  const handleOpenDeleteSelected = useCallback(
    () => setDeleteIds(selection),
    [selection],
  );
  const handleResumeSelected = useCallback(() => {
    if (selectedDraftHref) handleNavigateDraft(selectedDraftHref);
  }, [handleNavigateDraft, selectedDraftHref]);
  const handleCloseDelete = useCallback(
    (open: boolean) => {
      if (!open && !deleting) setDeleteIds([]);
    },
    [deleting],
  );
  const handleDeleteConfirm = useCallback(async () => {
    setDeleting(true);
    const failed: number[] = [];
    for (const id of deleteIds) {
      try {
        await deleteDraft.mutateAsync(id);
        setSelectedIds((current) => current.filter((item) => item !== id));
      } catch (error: unknown) {
        failed.push(id);
        toast.error(getErrorMessage(error));
      }
    }
    setDeleteIds(failed);
    setDeleting(false);
    if (failed.length === 0)
      toast.success(
        deleteIds.length === 1 ? "Draft deleted" : "Selected drafts deleted",
      );
  }, [deleteDraft, deleteIds]);
  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);
  const handleNext = useCallback(() => {
    if (page?.pagination.hasMore) pager.goNext(page.pagination.nextCursor);
  }, [page, pager]);
  const renderDraft = useCallback(
    (draft: (typeof drafts)[number]) => {
      const href = getDraftResumeHref(draft, returnHref);
      return (
        <CommentDraftRow
          key={draft.id}
          draft={draft}
          href={href}
          onNavigate={handleNavigateDraft}
          onDelete={!href && canDelete ? handleDelete : undefined}
          selected={selection.includes(draft.id)}
          onSelect={canDelete ? handleSelect : undefined}
          selectionDisabled={deleting}
        />
      );
    },
    [
      canDelete,
      deleting,
      handleDelete,
      handleNavigateDraft,
      handleSelect,
      returnHref,
      selection,
    ],
  );

  return (
    <>
      {pageState.kind === "ready" &&
      drafts.length > 0 &&
      canDelete &&
      selection.length > 0 ? (
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2 border-b border-border px-3 py-2">
          <Checkbox
            checked={
              allSelected ? true : selection.length ? "indeterminate" : false
            }
            onCheckedChange={handleSelectAll}
            disabled={deleting}
            aria-label="Select drafts on this page"
          />
          <span className="min-w-0 truncate text-xs text-muted-foreground tabular-nums">
            {selection.length
              ? `${selection.length} selected`
              : "Select drafts"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {selectedDraftHref ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResumeSelected}
                disabled={deleting}
                aria-label="Resume selected draft"
              >
                Resume
              </Button>
            ) : null}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="size-9"
                    onClick={handleOpenDeleteSelected}
                    aria-label={`Delete selected ${selection.length === 1 ? "draft" : "drafts"} (${selection.length})`}
                    disabled={deleting}
                  >
                    <TrashIcon aria-hidden="true" className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Delete selected drafts
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ) : null}
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
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
            {drafts.map(renderDraft)}
            {drafts.length === 0 ? (
              <EmptyState
                compact
                title="No drafts on this page"
                description="Go back to the previous page to view your other saved drafts."
                className="flex-1"
              />
            ) : null}
          </div>
        </PageState>
      </div>
      {pageState.kind === "ready" ? (
        <TablePagination
          mode="cursor"
          rowCount={drafts.length}
          pageNumber={pager.pageNumber}
          hasMore={Boolean(
            page?.pagination.hasMore && page.pagination.nextCursor,
          )}
          hasPrevious={pager.hasPrevious}
          onNext={handleNext}
          onPrevious={pager.goPrevious}
          disabled={query.isFetching || deleting}
          compact
          showSummary={false}
        />
      ) : null}
      <ConfirmDialog
        destructive
        isPending={deleting}
        confirmLabel="Delete"
        open={deleteIds.length > 0}
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleCloseDelete}
        title={
          deleteIds.length === 1 ? "Delete draft?" : "Delete selected drafts?"
        }
        description={`Permanently delete ${deleteIds.length === 1 ? "this saved comment draft" : `these ${deleteIds.length} saved comment drafts`}. This cannot be undone.`}
      />
    </>
  );
}
