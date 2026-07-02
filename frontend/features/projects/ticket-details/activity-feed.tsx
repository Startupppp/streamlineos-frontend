"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, Loader2, MessageSquare, Link, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { useAddComment } from "@/hooks/api/projects";
import { useUpdateComment, useDeleteComment } from "@/hooks/api/projects/comment-mutations";
import { useAddReaction, useRemoveReaction } from "@/hooks/api/projects/reactions";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import type { TicketComment, TicketUser, CommentReaction } from "@/types/projects";
import { MentionTextarea, type MentionUser } from "@/features/projects/comments/mention-textarea";
import { EmojiReactionBar, type ReactionGroup } from "@/features/projects/comments/emoji-reaction-bar";
import { formatMentionText } from "@/lib/format-mention";

interface ActivityFeedProps {
  ticketId: number;
  projectId?: number;
  comments: TicketComment[];
  members?: MentionUser[];
  highlightCommentId?: number | null;
}

function groupReactions(
  rawReactions: CommentReaction[],
  currentUserId?: string
): ReactionGroup[] {
  const groups: Record<string, { count: number; hasReacted: boolean }> = {};
  for (const r of rawReactions) {
    if (!groups[r.emoji]) groups[r.emoji] = { count: 0, hasReacted: false };
    groups[r.emoji].count++;
    if (r.userId === currentUserId) groups[r.emoji].hasReacted = true;
  }
  return Object.entries(groups).map(([emoji, g]) => ({ emoji, count: g.count, hasReacted: g.hasReacted }));
}

export function ActivityFeed({ ticketId, projectId = 0, comments, members = [], highlightCommentId }: ActivityFeedProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [commentNotFoundDismissed, setCommentNotFoundDismissed] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const commentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canManage = useCan("projects:manage");

  const commentNotFound =
    !commentNotFoundDismissed &&
    !!highlightCommentId &&
    comments.length > 0 &&
    !comments.some((c) => c.id === highlightCommentId);

  useEffect(() => {
    if (!highlightCommentId) return;
    const el = commentRefs.current.get(highlightCommentId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightCommentId]);

  const addComment = useAddComment({
    onSuccess: () => {
      setNewComment("");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const addReply = useAddComment({
    onSuccess: () => {
      setReplyText("");
      setReplyingTo(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
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
    (parentId: number) => {
      const content = replyText.trim();
      if (!content) return;
      addReply.mutate({ ticketId, projectId, content, parentCommentId: parentId });
    },
    [replyText, ticketId, projectId, addReply]
  );

  const handleSaveEdit = useCallback(
    (commentId: number, content: string) => {
      updateComment.mutate(
        { commentId, ticketId, projectId, content },
        {
          onSuccess: () => toast.success("Comment updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [updateComment, ticketId, projectId]
  );

  const handleDeleteComment = useCallback(
    (commentId: number) => {
      deleteComment.mutate(
        { commentId, ticketId, projectId },
        {
          onSuccess: () => toast.success("Comment deleted"),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [deleteComment, ticketId, projectId]
  );

  const handleTopKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleReplyKeyDown = useCallback(
    (parentId: number) =>
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleReplySubmit(parentId);
        }
      },
    [handleReplySubmit]
  );

  const topLevel = comments.filter((c) => !c.parentCommentId);
  const repliesMap = comments
    .filter((c) => !!c.parentCommentId)
    .reduce<Record<number, TicketComment[]>>((acc, r) => {
      const parentId = r.parentCommentId!;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(r);
      return acc;
    }, {});

  const sortedTopLevel = [...topLevel].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText("");
  }, []);

  const handleDismissNotFound = useCallback(() => setCommentNotFoundDismissed(true), []);

  return (
    <div className="space-y-4">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Activity
        {comments.length > 0 && (
          <span className="text-muted-foreground/70">({comments.length})</span>
        )}
      </h4>

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

      <div className="space-y-2">
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
                onReply={() => setReplyingTo(comment.id)}
                onCancelReply={handleCancelReply}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onReplySubmit={() => handleReplySubmit(comment.id)}
                onReplyKeyDown={handleReplyKeyDown(comment.id)}
                isReplyPending={addReply.isPending}
                onReact={(emoji) => addReaction.mutate({ commentId: comment.id, emoji })}
                onUnreact={(emoji) => removeReaction.mutate({ commentId: comment.id, emoji })}
                isHighlighted={highlightCommentId === comment.id}
                permalinkUrl={`/projects/${projectId}?ticket=${ticketId}&comment=${comment.id}`}
                canManage={canManage}
                onSaveEdit={handleSaveEdit}
                onDelete={handleDeleteComment}
                isSavingEdit={updateComment.isPending}
                isDeletingComment={deleteComment.isPending}
              />
              {(repliesMap[comment.id]?.length ?? 0) > 0 && (
                <div className="ml-9 mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                  {[...repliesMap[comment.id]]
                    .sort(
                      (a, b) =>
                        new Date(a.createdAt || 0).getTime() -
                        new Date(b.createdAt || 0).getTime()
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
                          onReply={() => {}}
                          onCancelReply={() => {}}
                          replyText=""
                          onReplyTextChange={() => {}}
                          onReplySubmit={() => {}}
                          onReplyKeyDown={() => {}}
                          isReplyPending={false}
                          onReact={(emoji) => addReaction.mutate({ commentId: reply.id, emoji })}
                          onUnreact={(emoji) => removeReaction.mutate({ commentId: reply.id, emoji })}
                          hideReplyButton
                          isHighlighted={highlightCommentId === reply.id}
                          permalinkUrl={`/projects/${projectId}?ticket=${ticketId}&comment=${reply.id}`}
                          canManage={canManage}
                          onSaveEdit={handleSaveEdit}
                          onDelete={handleDeleteComment}
                          isSavingEdit={updateComment.isPending}
                          isDeletingComment={deleteComment.isPending}
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

interface CommentItemProps {
  comment: TicketComment;
  currentUserId?: string;
  members: MentionUser[];
  isReplying: boolean;
  onReply: () => void;
  onCancelReply: () => void;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: () => void;
  onReplyKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isReplyPending: boolean;
  onReact: (emoji: string) => void;
  onUnreact: (emoji: string) => void;
  hideReplyButton?: boolean;
  isHighlighted?: boolean;
  permalinkUrl?: string;
  canManage: boolean;
  onSaveEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
  isSavingEdit: boolean;
  isDeletingComment: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  members,
  isReplying,
  onReply,
  onCancelReply,
  replyText,
  onReplyTextChange,
  onReplySubmit,
  onReplyKeyDown,
  isReplyPending,
  onReact,
  onUnreact,
  hideReplyButton = false,
  isHighlighted = false,
  permalinkUrl,
  canManage,
  onSaveEdit,
  onDelete,
  isSavingEdit,
  isDeletingComment,
}: CommentItemProps) {
  const user = comment.user as TicketUser | undefined;
  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
    : "";
  const isEdited =
    comment.updatedAt &&
    comment.createdAt &&
    new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();

  const isAuthor = !!currentUserId && user?.id === currentUserId;
  const canDelete = isAuthor || canManage;

  const reactionGroups = groupReactions(comment.reactions ?? [], currentUserId);
  const [showHighlight, setShowHighlight] = useState(isHighlighted);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  useEffect(() => {
    if (!isHighlighted) return;
    setShowHighlight(true);
    const timer = setTimeout(() => setShowHighlight(false), 2500);
    return () => clearTimeout(timer);
  }, [isHighlighted]);

  const handleCopyLink = useCallback(() => {
    if (!permalinkUrl) return;
    navigator.clipboard.writeText(window.location.origin + permalinkUrl).then(() => {
      toast.success("Link copied");
    });
  }, [permalinkUrl]);

  const handleStartEdit = useCallback(() => {
    setEditText(comment.content);
    setIsEditing(true);
  }, [comment.content]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(comment.content);
  }, [comment.content]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.content) {
      setIsEditing(false);
      return;
    }
    onSaveEdit(comment.id, trimmed);
    setIsEditing(false);
  }, [editText, comment.content, comment.id, onSaveEdit]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const handleDeleteConfirm = useCallback(() => {
    onDelete(comment.id);
  }, [onDelete, comment.id]);

  return (
    <div className={`flex gap-2.5 group rounded-lg transition-colors duration-500 ${showHighlight ? "bg-blue-50/40 ring-1 ring-blue-200 px-2 -mx-2 py-1" : ""}`}>
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarImage src={resolveImageUrl(user?.image)} />
        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
          {user?.firstName?.[0]}
          {user?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          {isEdited && (
            <span className="text-[10px] text-muted-foreground/60 italic">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-1.5">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="min-h-[60px] text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-1.5 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                className="h-7 px-2 text-xs"
                disabled={isSavingEdit}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editText.trim() || isSavingEdit}
                className="h-7 px-2 text-xs"
              >
                {isSavingEdit ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
            {formatMentionText(comment.content)}
          </p>
        )}

        {!isEditing && (
          <div className="flex items-center gap-3 mt-1.5">
            <EmojiReactionBar
              reactions={reactionGroups}
              onReact={onReact}
              onUnreact={onUnreact}
            />
            {!hideReplyButton && (
              <button
                type="button"
                onClick={onReply}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                Reply
              </button>
            )}
            {permalinkUrl && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center gap-1"
                aria-label="Copy comment link"
              >
                <Link className="h-3 w-3" />
                Copy link
              </button>
            )}
            {isAuthor && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center gap-1"
                aria-label="Edit comment"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
                    aria-label="Delete comment"
                    disabled={isDeletingComment}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the comment and all replies. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteConfirm}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        {isReplying && (
          <div className="mt-2 space-y-1.5">
            <MentionTextarea
              value={replyText}
              onChange={onReplyTextChange}
              onKeyDown={onReplyKeyDown}
              placeholder="Write a reply... (Ctrl+Enter to send)"
              className="min-h-[60px] text-sm"
              users={members}
              rows={2}
            />
            <div className="flex gap-1.5 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelReply}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onReplySubmit}
                disabled={!replyText.trim() || isReplyPending}
                className="h-7 px-2 text-xs"
              >
                {isReplyPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
