"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/ui/combobox";
import { useFeedbackPosts, useMergeFeedbackPost } from "@/hooks/api/build/roadmap";
import type { FeedbackPost } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";

interface MergeFeedbackDialogProps {
  post: FeedbackPost | null;
  onOpenChange: (open: boolean) => void;
}

export function MergeFeedbackDialog({ post, onOpenChange }: MergeFeedbackDialogProps) {
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const merge = useMergeFeedbackPost();
  const { data, isLoading } = useFeedbackPosts({
    search: search.trim() ? search.trim() : undefined,
    limit: 20,
  });

  const options = useMemo<ComboboxOption[]>(() => {
    const rows = data?.data ?? [];
    return rows
      .filter((row) => row.id !== post?.id)
      .map((row) => ({
        value: String(row.id),
        label: row.title,
        sublabel: `${row.votes} ${row.votes === 1 ? "vote" : "votes"}`,
      }));
  }, [data, post]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSearch("");
        setTargetId("");
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const handleConfirm = useCallback(() => {
    if (!post || !targetId) return;
    merge.mutate(
      { id: post.id, targetPostId: Number(targetId) },
      {
        onSuccess: () => {
          toast.success("Feedback merged");
          handleOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [merge, post, targetId, handleOpenChange]);

  return (
    <Dialog open={post !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge feedback</DialogTitle>
          <DialogDescription>
            {post
              ? `"${post.title}" will be marked as a duplicate and its votes moved to the post you pick. Voters who already voted on both are only counted once.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="merge-target">
            Merge into
          </label>
          <Combobox
            options={options}
            value={targetId}
            onChange={setTargetId}
            onSearchChange={setSearch}
            placeholder={isLoading ? "Loading feedback…" : "Search feedback by title…"}
            searchPlaceholder="Search feedback…"
            emptyText="No other feedback found"
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton onClick={handleConfirm} disabled={!targetId} isPending={merge.isPending}>
            Merge
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
