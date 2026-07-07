"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageSquare, AlertTriangle, X } from "lucide-react";
import { useAddComment } from "@/hooks/api/projects";
import { useUpdateComment, useDeleteComment } from "@/hooks/api/projects/comment-mutations";
import { useAddReaction, useRemoveReaction } from "@/hooks/api/projects/reactions";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TicketComment } from "@/types/projects";
import { MentionTextarea, type MentionUser } from "@/features/projects/comments/mention-textarea";
import { CommentItem } from "./comment-item";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";

interface ActivityFeedProps {
  ticketId: number;
  projectId?: number;
  projectKey?: string | null;
  ticketNumber?: number | null;
  comments: TicketComment[];
  members?: MentionUser[];
  highlightCommentId?: number | null;
}

const noopVoid = () => {};
const noopStr = (_: string) => {};

export function ActivityFeed({
  ticketId,
  projectId = 0,
  projectKey,
  ticketNumber,
  comments,
  members = [],
  highlightCommentId,
}: ActivityFeedProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingSaveId, setEditingSaveId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [commentNotFoundDismissed, setCommentNotFoundDismissed] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const commentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canManage = useCan("projects:manage");

  const commentPermalink = useCallback(
    (commentId: number) => {
      if (ticketNumber != null) {
        return getTicketDetailHref(projectId, projectKey, ticketNumber, commentId);
      }
      return `/projects/${projectId}?ticket=${ticketId}&comment=${commentId}`;
    },
    [projectId, projectKey, ticketNumber, ticketId],
  );

  const commentNotFound =
    !commentNotFoundDismissed &&
    !!highlightCommentId &&
    comments.length > 0 &&
    !comments.some((c) => c.id === highlightCommentId);

  useEffect(() => {
    if (!highlightCommentId) return;
    const el = commentRefs.current.get(highlightCommentId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCommentId]);

  const addComment = useAddComment({
    onSuccess: () => setNewComment(""),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addReply = useAddComment({
    onSuccess: () => {
      setReplyText("");
      setReplyingTo(null);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const addReaction = useAddReaction(projectId, ticketId);
  const removeReaction = useRemoveReaction(projectId, ticketId);

  const handleSubmit = useCallback(() => {
    const content = newComment.trim();
    if (!content) return;
    addComment.mutate({ ticketId, projectId, content });
  }, [newComment, ticketId, projectId, addComment]);

  const handleReplySubmit = useCallback(
    (commentId: number) => {
      const content = replyText.trim();
      if (!content) return;
      addReply.mutate({ ticketId, projectId, content, parentCommentId: commentId });
    },
    [replyText, ticketId, projectId, addReply],
  );

  const handleSaveEdit = useCallback(
    (commentId: number, content: string) => {
      setEditingSaveId(commentId);
      updateComment.mutate(
        { commentId, ticketId, projectId, content },
        {
          onSuccess: () => toast.success("Comment updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => setEditingSaveId(null),
        },
      );
    },
    [updateComment, ticketId, projectId],
  );

  const handleDeleteComment = useCallback(
    (commentId: number) => {
      setDeletingId(commentId);
      deleteComment.mutate(
        { commentId, ticketId, projectId },
        {
          onSuccess: () => toast.success("Comment deleted"),
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => setDeletingId(null),
        },
      );
    },
    [deleteComment, ticketId, projectId],
  );

  const handleTopKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleReplyKeyDown = useCallback(
    (parentId: number) =>
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleReplySubmit(parentId);
        }
      },
    [handleReplySubmit],
  );

  const handleReply = useCallback((commentId: number) => {
    setReplyingTo(commentId);
  }, []);

  const handleReact = useCallback(
    (commentId: number, emoji: string) => {
      addReaction.mutate({ commentId, emoji });
    },
    [addReaction],
  );

  const handleUnreact = useCallback(
    (commentId: number, emoji: string) => {
      removeReaction.mutate({ commentId, emoji });
    },
    [removeReaction],
  );

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText("");
  }, []);

  const handleDismissNotFound = useCallback(() => setCommentNotFoundDismissed(true), []);

  const { repliesMap, sortedTopLevel } = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parentCommentId);
    const built = comments
      .filter((c) => !!c.parentCommentId)
      .reduce<Record<number, TicketComment[]>>((acc, r) => {
        const parentId = r.parentCommentId!;
        if (!acc[parentId]) acc[parentId] = [];
        acc[parentId].push(r);
        return acc;
      }, {});
    const sortedTopLevel = [...topLevel].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    return { repliesMap: built, sortedTopLevel };
  }, [comments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5 shrink-0 sm:pt-2.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Activity
          {comments.length > 0 && (
            <span className="text-muted-foreground/70">({comments.length})</span>
          )}
        </h4>

        <div className="space-y-2 flex-1 min-w-0">
          <MentionTextarea
            value={newComment}
            onChange={setNewComment}
            onKeyDown={handleTopKeyDown}
            placeholder="Write a comment... (Ctrl+Enter to send)"
            className="min-h-[80px] text-sm"
            users={members}
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
      </div>

      {commentNotFound && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
          <span className="flex-1">Comment not found — it may have been deleted.</span>
          <button
            type="button"
            onClick={handleDismissNotFound}
            aria-label="Dismiss"
            className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {sortedTopLevel.length > 0 && (
        <div className="space-y-3">
          {sortedTopLevel.map((comment) => (
            <div
              key={comment.id}
              ref={(el) => {
                if (el) commentRefs.current.set(comment.id, el);
                else commentRefs.current.delete(comment.id);
              }}
            >
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                members={members}
                isReplying={replyingTo === comment.id}
                onReply={handleReply}
                onCancelReply={handleCancelReply}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onReplySubmit={handleReplySubmit}
                onReplyKeyDown={handleReplyKeyDown(comment.id)}
                isReplyPending={addReply.isPending}
                onReact={handleReact}
                onUnreact={handleUnreact}
                isHighlighted={highlightCommentId === comment.id}
                permalinkUrl={commentPermalink(comment.id)}
                canManage={canManage}
                onSaveEdit={handleSaveEdit}
                onDelete={handleDeleteComment}
                isSavingEdit={editingSaveId === comment.id}
                isDeletingComment={deletingId === comment.id}
              />
              {(repliesMap[comment.id]?.length ?? 0) > 0 && (
                <div className="ml-9 mt-2 space-y-2 border-l border-border pl-3">
                  {[...repliesMap[comment.id]]
                    .sort(
                      (a, b) =>
                        new Date(a.createdAt || 0).getTime() -
                        new Date(b.createdAt || 0).getTime(),
                    )
                    .map((reply) => (
                      <div
                        key={reply.id}
                        ref={(el) => {
                          if (el) commentRefs.current.set(reply.id, el);
                          else commentRefs.current.delete(reply.id);
                        }}
                      >
                        <CommentItem
                          comment={reply}
                          currentUserId={currentUserId}
                          members={members}
                          isReplying={false}
                          onReply={handleReply}
                          onCancelReply={handleCancelReply}
                          replyText=""
                          onReplyTextChange={noopStr}
                          onReplySubmit={handleReplySubmit}
                          onReplyKeyDown={noopVoid}
                          isReplyPending={false}
                          onReact={handleReact}
                          onUnreact={handleUnreact}
                          hideReplyButton
                          isHighlighted={highlightCommentId === reply.id}
                          permalinkUrl={commentPermalink(reply.id)}
                          canManage={canManage}
                          onSaveEdit={handleSaveEdit}
                          onDelete={handleDeleteComment}
                          isSavingEdit={editingSaveId === reply.id}
                          isDeletingComment={deletingId === reply.id}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
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
