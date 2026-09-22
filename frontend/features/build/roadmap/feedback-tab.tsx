"use client";

import { useEffect, useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useFeedbackPosts,
  useDeleteFeedbackPost,
  useRoadmapItems,
} from "@/hooks/api/build/roadmap";
import type { FeedbackPost } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmStaggerList, PM_FILL_PANEL, PM_PANEL } from "@/components/pm-chrome";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { FeedbackRow } from "./feedback-row";
import { MergeFeedbackDialog } from "./merge-feedback-dialog";

interface FeedbackTabProps {
  search: string;
}

function FeedbackListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={cn(PM_PANEL, "flex gap-3 p-3")}>
          <Skeleton className="h-12 w-10 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedbackTab({ search }: FeedbackTabProps) {
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const currentCursor = cursorHistory[cursorIdx];
  const isFiltered = search.trim().length > 0;

  const { data, isLoading, isError, error, refetch } = useFeedbackPosts(
    isFiltered ? { search: search.trim(), cursor: currentCursor } : { cursor: currentCursor },
  );
  const { data: roadmapData } = useRoadmapItems();
  const deletePost = useDeleteFeedbackPost();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackPost | null>(null);
  const [mergeTarget, setMergeTarget] = useState<FeedbackPost | null>(null);

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty: (data?.data ?? []).length === 0 && cursorIdx === 0,
  });

  const handleSetMergeTarget = useCallback((post: FeedbackPost) => {
    setMergeTarget(post);
  }, []);

  const handleMergeDialogChange = useCallback((open: boolean) => {
    if (!open) setMergeTarget(null);
  }, []);

  useEffect(() => {
    setCursorHistory([undefined]);
    setCursorIdx(0);
  }, [search]);

  function handleRetry() {
    void refetch();
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleSetDeleteTarget = useCallback((post: FeedbackPost) => {
    setDeleteTarget(post);
  }, []);

  function handleDelete() {
    if (!deleteTarget) return;
    deletePost.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Feedback deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleNext() {
    const nc = data?.pagination.nextCursor;
    if (!nc) return;
    setCursorHistory((prev) => [...prev.slice(0, cursorIdx + 1), nc]);
    setCursorIdx((prev) => prev + 1);
  }

  function handlePrev() {
    if (cursorIdx === 0) return;
    setCursorIdx((prev) => prev - 1);
  }

  const hasPrev = cursorIdx > 0;
  const hasNext = data?.pagination.hasMore ?? false;

  return (
    <>
      <PageState
        resolution={resolution}
        loading={<FeedbackListSkeleton />}
        empty={
          <EmptyState
            className={PM_FILL_PANEL}
            illustration={<EmptyMailIllustration />}
            title={isFiltered ? "No feedback matched your search" : "No feedback yet"}
            description={
              isFiltered
                ? undefined
                : "Feedback submitted from your public board will appear here, sorted by votes."
            }
            filtersActive={isFiltered}
          />
        }
        onRetry={handleRetry}
        className={PM_FILL_PANEL}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <PmStaggerList className="space-y-2">
            {(data?.data ?? []).map((post) => (
              <FeedbackRow
                key={post.id}
                post={post}
                roadmapItems={roadmapData?.data ?? []}
                onDelete={handleSetDeleteTarget}
                onMerge={handleSetMergeTarget}
              />
            ))}
          </PmStaggerList>

          {(hasPrev || hasNext) ? (
            <div className="flex items-center justify-center gap-2 border-t pt-2">
              <Button variant="ghost" size="sm" onClick={handlePrev} disabled={!hasPrev}>
                Previous
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} disabled={!hasNext}>
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </PageState>

      <MergeFeedbackDialog post={mergeTarget} onOpenChange={handleMergeDialogChange} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete feedback?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
