"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { SendIcon, XIcon } from "@animateicons/react/lucide";
import { useAddComment } from "@/hooks/api/projects";
import { useCreateTicket } from "@/hooks/api/projects/tickets";
import {
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/api/projects/comment-mutations";
import {
  useUpsertCommentDraft,
  useDeleteCommentDraftByTicket,
} from "@/hooks/api/projects/comment-drafts";
import {
  useAddReaction,
  useRemoveReaction,
} from "@/hooks/api/projects/reactions";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TicketComment } from "@/types/projects";
import {
  MentionTextarea,
  type MentionUser,
} from "@/features/projects/comments/mention-textarea";
import { CommentItem } from "./comment-item";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";
import { queryKeys } from "@/lib/query-keys";

interface ActivityFeedProps {
  ticketId: number;
  projectId?: number;
  projectKey?: string | null;
  ticketNumber?: number | null;
  comments: TicketComment[];
  members?: MentionUser[];
  highlightCommentId?: number | null;
  activityAiActions?: React.ReactNode;
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
  activityAiActions,
}: ActivityFeedProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingSaveId, setEditingSaveId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [commentNotFoundDismissed, setCommentNotFoundDismissed] =
    useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const commentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upsertDraft = useUpsertCommentDraft();
  const deleteDraftByTicket = useDeleteCommentDraftByTicket();
  const upsertDraftMutateRef = useRef(upsertDraft.mutate);
  upsertDraftMutateRef.current = upsertDraft.mutate;
  const canManage = useCan("projects:manage");
  const router = useRouter();
  const queryClient = useQueryClient();

  const commentPermalink = useCallback(
    (commentId: number) => {
      if (ticketNumber == null) return undefined;
      return getTicketDetailHref(
        projectId,
        projectKey,
        ticketNumber,
        commentId,
      );
    },
    [projectId, projectKey, ticketNumber],
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
  }, [highlightCommentId, comments]);

  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (!newComment.trim()) return;
    draftTimerRef.current = setTimeout(() => {
      upsertDraftMutateRef.current({ ticketId, body: newComment });
    }, 1200);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [newComment, ticketId]);

  const addComment = useAddComment({
    onSuccess: () => {
      setNewComment("");
      deleteDraftByTicket.mutate(ticketId);
    },
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
      addReply.mutate({
        ticketId,
        projectId,
        content,
        parentCommentId: commentId,
      });
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
    (parentId: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleDismissNotFound = useCallback(
    () => setCommentNotFoundDismissed(true),
    [],
  );

  const createTicket = useCreateTicket({
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ticketActivity.list(ticketId),
      });
      toast.success("Issue created");
      if (ticket.projectId != null && ticket.ticketNumber != null) {
        router.push(
          getTicketDetailHref(
            ticket.projectId,
            ticket.project?.key ?? projectKey,
            ticket.ticketNumber,
          ),
        );
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handleCreateIssue = useCallback(
    (commentId: number, content: string) => {
      if (!projectId) return;
      const sourceRef =
        ticketNumber != null && projectKey
          ? `${projectKey}-${ticketNumber}`
          : `ticket #${ticketId}`;
      createTicket.mutate({
        projectId,
        title: `Issue from comment on ${sourceRef}`,
        description: `${content}\n\n---\nCreated from a comment on ${sourceRef} (comment #${commentId}).`,
        type: "TASK",
      });
    },
    [createTicket, projectId, ticketId, ticketNumber, projectKey],
  );

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
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
    return { repliesMap: built, sortedTopLevel };
  }, [comments]);

  return (
    <div className="w-full space-y-4">
      <div className="flex w-full flex-1 min-w-0 flex-col gap-2">
        <h4 className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Activity</span>
          {comments.length > 0 && (
            <span className="shrink-0 text-muted-foreground/70">
              ({comments.length})
            </span>
          )}
          {activityAiActions}
        </h4>

        <div className="flex w-full min-w-0 flex-row items-end gap-2">
          <MentionTextarea
            value={newComment}
            onChange={setNewComment}
            onKeyDown={handleTopKeyDown}
            placeholder="Write a comment... (Ctrl+Enter to send)"
            wrapperClassName="flex-1 min-w-0"
            className="min-h-[80px] text-sm"
            users={members}
          />
          <AnimatedIconButton
            type="button"
            size="icon-sm"
            icon={SendIcon}
            iconSize={14}
            className="shrink-0"
            onClick={handleSubmit}
            disabled={!newComment.trim() || addComment.isPending}
            aria-label="Post comment"
          />
        </div>
      </div>

      {commentNotFound && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
          <span className="flex-1">
            Comment not found — it may have been deleted.
          </span>
          <button
            type="button"
            onClick={handleDismissNotFound}
            aria-label="Dismiss"
            className="shrink-0 text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            <XIcon size={14} />
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
                onCreateIssue={handleCreateIssue}
              />
              {(repliesMap[comment.id]?.length ?? 0) > 0 && (
                <div className="ml-4 mt-2 space-y-2 border-l border-border pl-3 sm:ml-9">
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
                          onCreateIssue={handleCreateIssue}
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
