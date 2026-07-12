"use client";

import { memo, useCallback } from "react";
import { ArrowBigUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUpdateFeedbackPost } from "@/hooks/api/projects/roadmap";
import type { FeedbackPost, RoadmapItem, FeedbackStatus } from "@/types/projects";
import { FEEDBACK_STATUS_OPTIONS, FEEDBACK_STATUS_VARIANT } from "./roadmap-constants";

interface FeedbackRowProps {
  post: FeedbackPost;
  roadmapItems: RoadmapItem[];
  onDelete: (post: FeedbackPost) => void;
}

export const FeedbackRow = memo(function FeedbackRow({ post, roadmapItems, onDelete }: FeedbackRowProps) {
  const update = useUpdateFeedbackPost();

  const handleStatusChange = useCallback((value: string) => {
    const found = FEEDBACK_STATUS_OPTIONS.find((o) => o.value === value);
    if (!found) return;
    update.mutate(
      { id: post.id, status: found.value },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: () => toast.error("Failed to update status"),
      },
    );
  }, [update, post.id]);

  const handleLinkChange = useCallback((value: string) => {
    update.mutate(
      { id: post.id, linkedRoadmapItemId: value === "none" ? null : Number(value) },
      {
        onSuccess: () => toast.success("Linked roadmap item updated"),
        onError: () => toast.error("Failed to link item"),
      },
    );
  }, [update, post.id]);

  const handleDeleteClick = useCallback(() => {
    onDelete(post);
  }, [onDelete, post]);

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-center rounded-md border border-border/60 px-2 py-1 shrink-0">
          <ArrowBigUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold tabular-nums">{post.votes}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{post.title}</p>
              {post.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{post.description}</p>
              )}
              {post.submittedByName && (
                <p className="text-[11px] text-muted-foreground mt-1">by {post.submittedByName}</p>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={post.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={post.linkedRoadmapItemId ? String(post.linkedRoadmapItemId) : "none"}
              onValueChange={handleLinkChange}
            >
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue placeholder="Link roadmap item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No roadmap link</SelectItem>
                {roadmapItems.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant={FEEDBACK_STATUS_VARIANT[post.status]} className="text-[10px]">
              {FEEDBACK_STATUS_OPTIONS.find((o) => o.value === post.status)?.label}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
});
