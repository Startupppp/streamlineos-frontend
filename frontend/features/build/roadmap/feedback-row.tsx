"use client";

import { memo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowBigUp } from "lucide-react";
import { GitMergeIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUpdateFeedbackPost } from "@/hooks/api/build/roadmap";
import type { FeedbackPost, RoadmapItem } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";
import { listItem, listItemReduced, pmSnappy } from "@/features/build/shared/pm-motion";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FEEDBACK_STATUS_OPTIONS, FEEDBACK_STATUS_VARIANT } from "./roadmap-constants";

interface FeedbackRowProps {
  post: FeedbackPost;
  roadmapItems: RoadmapItem[];
  onDelete: (post: FeedbackPost) => void;
  onMerge: (post: FeedbackPost) => void;
}

export const FeedbackRow = memo(function FeedbackRow({
  post,
  roadmapItems,
  onDelete,
  onMerge,
}: FeedbackRowProps) {
  const update = useUpdateFeedbackPost();
  const shouldReduceMotion = useReducedMotion();

  const handleStatusChange = useCallback(
    (value: string) => {
      const found = FEEDBACK_STATUS_OPTIONS.find((o) => o.value === value);
      if (!found) return;
      update.mutate(
        { id: post.id, status: found.value },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [update, post.id],
  );

  const handleLinkChange = useCallback(
    (value: string) => {
      update.mutate(
        { id: post.id, linkedRoadmapItemId: value === "none" ? null : Number(value) },
        {
          onSuccess: () => toast.success("Linked roadmap item updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [update, post.id],
  );

  const handleDeleteClick = useCallback(() => {
    onDelete(post);
  }, [onDelete, post]);

  const handleMergeClick = useCallback(() => {
    onMerge(post);
  }, [onMerge, post]);

  const isMerged = post.duplicateOfId !== null;

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      className={cn(
        PM_PANEL,
        "p-3 transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-md border border-border/60 bg-muted/30 px-2 py-1">
          <ArrowBigUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold tabular-nums">{post.votes}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <TruncatedText text={post.title} className="text-sm font-medium" />
              {post.description ? (
                <p
                  className={cn(TEXT_TWO_LINES, "mt-0.5 text-xs text-muted-foreground")}
                  title={post.description}
                >
                  {post.description}
                </p>
              ) : null}
              {post.submittedByName ? (
                <p className={cn(TEXT_ONE_LINE, "mt-1 text-[11px] text-muted-foreground")}>
                  by {post.submittedByName}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isMerged ? null : (
                <AnimatedIconButton
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={handleMergeClick}
                  icon={GitMergeIcon}
                  iconSize={12}
                  aria-label="Merge into another post"
                />
              )}
              <AnimatedIconButton
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={handleDeleteClick}
                icon={Trash2Icon}
                iconSize={12}
                aria-label="Delete feedback"
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Select value={post.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={post.linkedRoadmapItemId ? String(post.linkedRoadmapItemId) : "none"}
              onValueChange={handleLinkChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Link roadmap item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No roadmap link</SelectItem>
                {roadmapItems.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant={FEEDBACK_STATUS_VARIANT[post.status]} className="text-[10px]">
              {FEEDBACK_STATUS_OPTIONS.find((o) => o.value === post.status)?.label}
            </Badge>
            {isMerged ? (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                Merged duplicate
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
