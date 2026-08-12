"use client";

import { useEffect, useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import {
  useFeedbackPosts,
  useDeleteFeedbackPost,
  useRoadmapItems,
} from "@/hooks/api/build/roadmap";
import { TablePagination } from "@/components/ui/table-pagination";
import type { FeedbackPost } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmStaggerList, PM_FILL_PANEL, PM_PANEL } from "@/features/build/shared/pm-chrome";
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
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useFeedbackPosts(
    search.trim() ? { search: search.trim(), page } : { page },
  );
  const { data: roadmapData } = useRoadmapItems();
  const deletePost = useDeleteFeedbackPost();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackPost | null>(null);
  const [mergeTarget, setMergeTarget] = useState<FeedbackPost | null>(null);

  const handleSetMergeTarget = useCallback((post: FeedbackPost) => {
    setMergeTarget(post);
  }, []);

  const handleMergeDialogChange = useCallback((open: boolean) => {
    if (!open) setMergeTarget(null);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function handleRetry() {
    void refetch();
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handlePageChange(p: number) {
    setPage(p);
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

  if (isLoading) return <FeedbackListSkeleton />;

  if (isError) {
    return (
      <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
    );
  }

  if ((data?.data ?? []).length === 0) {
    return (
      <EmptyState
        className={PM_FILL_PANEL}
        illustration={<EmptyMailIllustration />}
        title="No feedback yet"
        description="Feedback submitted from your public board will appear here, sorted by votes."
      />
    );
  }

  return (
    <>
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

      <TablePagination
        page={page}
        pageSize={data?.pagination.limit ?? 50}
        total={data?.pagination.total ?? 0}
        onPageChange={handlePageChange}
        disabled={isLoading}
      />

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
