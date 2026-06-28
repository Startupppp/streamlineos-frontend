"use client";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useCreateKbComment,
  useDeleteKbComment,
  useKbArticleComments,
  useResolveKbComment,
  type KbComment,
} from "@/lib/api/hooks/kb/comments";

interface CommentThreadProps {
  articleId: number;
}

interface CommentItemProps {
  comment: KbComment;
  articleId: number;
  replies: KbComment[];
  allComments: KbComment[];
}

function CommentItem({ comment, articleId, replies, allComments }: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const createComment = useCreateKbComment();
  const deleteComment = useDeleteKbComment();
  const resolveComment = useResolveKbComment();

  const isResolved = !!comment.resolvedAt;

  function handleReplySubmit() {
    if (!replyContent.trim()) return;
    createComment.mutate(
      { articleId, content: replyContent.trim(), parentId: comment.id },
      {
        onSuccess: () => {
          setReplyContent("");
          setReplyOpen(false);
          toast.success("Reply posted");
        },
        onError: () => toast.error("Failed to post reply"),
      },
    );
  }

  function handleDelete() {
    deleteComment.mutate(
      { commentId: comment.id, articleId },
      {
        onSuccess: () => toast.success("Comment deleted"),
        onError: () => toast.error("Failed to delete comment"),
      },
    );
  }

  function handleResolve() {
    resolveComment.mutate(
      { commentId: comment.id, articleId },
      {
        onSuccess: () => toast.success("Comment resolved"),
        onError: () => toast.error("Failed to resolve comment"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "rounded-lg border bg-card p-3",
          isResolved && "opacity-60",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "flex-1 text-sm text-foreground",
              isResolved && "line-through decoration-muted-foreground",
            )}
          >
            {comment.content}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {isResolved && (
              <Badge variant="outline" className="gap-1 border-green-500 text-green-600 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setReplyOpen((prev) => !prev)}
          >
            <MessageSquare className="h-3 w-3" />
            Reply
          </Button>
          {!isResolved && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-green-600 hover:text-green-700"
              onClick={handleResolve}
              disabled={resolveComment.isPending}
            >
              <CheckCircle2 className="h-3 w-3" />
              Resolve
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteComment.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        {replyOpen && (
          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              placeholder="Write a reply…"
              rows={2}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleReplySubmit}
                disabled={createComment.isPending || !replyContent.trim()}
              >
                Post reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyOpen(false);
                  setReplyContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="ml-6 flex flex-col gap-2 border-l pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              replies={allComments.filter((c) => c.parentId === reply.id)}
              allComments={allComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ articleId }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const { data: comments = [], isLoading } = useKbArticleComments(articleId);
  const createComment = useCreateKbComment();

  const topLevel = comments.filter((c) => c.parentId === null);

  function handleAddComment() {
    if (!newComment.trim()) return;
    createComment.mutate(
      { articleId, content: newComment.trim() },
      {
        onSuccess: () => {
          setNewComment("");
          toast.success("Comment posted");
        },
        onError: () => toast.error("Failed to post comment"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              articleId={articleId}
              replies={comments.filter((c) => c.parentId === comment.id)}
              allComments={comments}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <Textarea
          placeholder="Add a comment…"
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="resize-none text-sm"
        />
        <Button
          className="self-start"
          onClick={handleAddComment}
          disabled={createComment.isPending || !newComment.trim()}
        >
          Add comment
        </Button>
      </div>
    </div>
  );
}
