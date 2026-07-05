"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { LoadingState } from "@/components/shared/loading-state";
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
import { FeedbackRow } from "./feedback-row";

interface FeedbackTabProps {
  search: string;
}

export function FeedbackTab({ search }: FeedbackTabProps) {
  const { data, isLoading, isError, refetch } = useFeedbackPosts(
    search.trim() ? { search: search.trim() } : {},
  );
  const { data: roadmapData } = useRoadmapItems();
  const deletePost = useDeleteFeedbackPost();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackPost | null>(null);

  function handleRetry() { refetch(); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleSetDeleteTarget(post: FeedbackPost) { setDeleteTarget(post); }

  function handleDelete() {
    if (!deleteTarget) return;
    deletePost.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Feedback deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete feedback"),
    });
  }

  if (isLoading) return <LoadingState variant="list" rows={6} />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyMailIllustration />}
        title="No feedback yet"
        description="Feedback submitted from your public board will appear here, sorted by votes."
        className="flex-1"
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((post) => (
        <FeedbackRow
          key={post.id}
          post={post}
          roadmapItems={roadmapData ?? []}
          onDelete={handleSetDeleteTarget}
        />
      ))}

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
    </div>
  );
}
