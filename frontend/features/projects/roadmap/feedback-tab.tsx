"use client";

import { useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
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
import { toast } from "sonner";
import {
  useFeedbackPosts,
  useDeleteFeedbackPost,
  useRoadmapItems,
} from "@/hooks/api/projects/roadmap";
import type { FeedbackPost } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmStaggerList, PM_FILL_PANEL, PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { FeedbackRow } from "./feedback-row";

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
  const { data, isLoading, isError, refetch } = useFeedbackPosts(
    search.trim() ? { search: search.trim() } : {},
  );
  const { data: roadmapData } = useRoadmapItems();
  const deletePost = useDeleteFeedbackPost();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackPost | null>(null);

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

  if (isLoading) return <FeedbackListSkeleton />;

  if (isError) {
    return (
      <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
    );
  }

  if (!data || data.length === 0) {
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
        {data.map((post) => (
          <FeedbackRow
            key={post.id}
            post={post}
            roadmapItems={roadmapData ?? []}
            onDelete={handleSetDeleteTarget}
          />
        ))}
      </PmStaggerList>

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
