"use client";

import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { useAddComment } from "@/hooks/api/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import type { TicketComment, TicketUser } from "@/types/projects";

interface ActivityFeedProps {
  ticketId: number;
  projectId?: number;
  comments: TicketComment[];
}

export function ActivityFeed({ ticketId, projectId, comments }: ActivityFeedProps) {
  const [newComment, setNewComment] = useState("");
  const addComment = useAddComment({
    onSuccess: () => {
      setNewComment("");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = useCallback(() => {
    const content = newComment.trim();
    if (!content) return;
    addComment.mutate({ ticketId, projectId, content });
  }, [newComment, ticketId, projectId, addComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="space-y-4">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Activity
        {comments.length > 0 && (
          <span className="text-muted-foreground/70">({comments.length})</span>
        )}
      </h4>

      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... (Ctrl+Enter to send)"
          className="min-h-[80px] text-sm resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || addComment.isPending}
          >
            {addComment.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1" />
            )}
            Comment
          </Button>
        </div>
      </div>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime()
            )
            .map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment.
        </p>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: TicketComment;
}

function CommentItem({ comment }: CommentItemProps) {
  const user = comment.user as TicketUser | undefined;
  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
    : "";

  return (
    <div className="flex gap-2.5 group">
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={resolveImageUrl(user?.image)} />
        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
          {user?.firstName?.[0]}
          {user?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
