"use client";

import { useState, useCallback, useEffect, memo } from "react";
import dynamic from "next/dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Send, Loader2, Link, Pencil, Trash2, X, CirclePlus } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { TicketComment, CommentReaction } from "@/types/projects";
import { MentionTextarea, type MentionUser } from "@/features/projects/comments/mention-textarea";
import { EmojiReactionBar, type ReactionGroup } from "@/features/projects/comments/emoji-reaction-bar";
import { RichTextContent } from "@/components/editor/rich-text-content";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[60px]" />
    ),
  },
);

function groupReactions(
  rawReactions: CommentReaction[],
  currentUserId?: string,
): ReactionGroup[] {
  const groups: Record<string, { count: number; hasReacted: boolean }> = {};
  for (const r of rawReactions) {
    if (!groups[r.emoji]) groups[r.emoji] = { count: 0, hasReacted: false };
    groups[r.emoji].count++;
    if (r.userId === currentUserId) groups[r.emoji].hasReacted = true;
  }
  return Object.entries(groups).map(([emoji, g]) => ({
    emoji,
    count: g.count,
    hasReacted: g.hasReacted,
  }));
}

export interface CommentItemProps {
  comment: TicketComment;
  currentUserId?: string;
  members: MentionUser[];
  isReplying: boolean;
  onReply: (commentId: number) => void;
  onCancelReply: () => void;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: (commentId: number) => void;
  onReplyKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isReplyPending: boolean;
  onReact: (commentId: number, emoji: string) => void;
  onUnreact: (commentId: number, emoji: string) => void;
  hideReplyButton?: boolean;
  isHighlighted?: boolean;
  permalinkUrl?: string;
  canManage: boolean;
  onSaveEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
  isSavingEdit: boolean;
  isDeletingComment: boolean;
  onCreateIssue?: (commentId: number, content: string) => void;
}

function CommentItemComponent({
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
  onCreateIssue,
}: CommentItemProps) {
  const user = comment.user;
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
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === "Escape") handleCancelEdit();
    },
    [handleSaveEdit, handleCancelEdit],
  );

  const handleEditContentChange = useCallback((html: string) => {
    setEditText(html);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete(comment.id);
  }, [onDelete, comment.id]);

  const handleReplyClick = useCallback(() => {
    onReply(comment.id);
  }, [onReply, comment.id]);

  const handleReactEmoji = useCallback(
    (emoji: string) => onReact(comment.id, emoji),
    [onReact, comment.id],
  );

  const handleUnreactEmoji = useCallback(
    (emoji: string) => onUnreact(comment.id, emoji),
    [onUnreact, comment.id],
  );

  const handleReplySubmitClick = useCallback(() => {
    onReplySubmit(comment.id);
  }, [onReplySubmit, comment.id]);

  const handleCreateIssue = useCallback(() => {
    onCreateIssue?.(comment.id, comment.content);
  }, [onCreateIssue, comment.id, comment.content]);

  return (
    <div
      className={`flex gap-2.5 group rounded-lg transition-colors duration-500 ${showHighlight ? "bg-blue-50/40 ring-1 ring-blue-200 px-2 -mx-2 py-1" : ""}`}
    >
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarImage src={resolveImageUrl(user?.image)} />
        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
          {getUserInitials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">
            {getUserDisplayName(user)}
          </span>
          <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          {isEdited && (
            <span className="text-[10px] text-muted-foreground/60 italic">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-1.5">
            <div onKeyDown={handleEditKeyDown}>
              <TiptapEditorDynamic
                content={editText}
                contentKey={comment.id}
                onChangeHtml={handleEditContentChange}
                output="html"
                minHeightClassName="min-h-[60px]"
                placeholder="Edit comment..."
                menuMode="bubble"
              />
            </div>
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
          <RichTextContent content={comment.content} contentKey={comment.id} />
        )}

        {!isEditing && (
          <div className="flex items-center gap-3 mt-1.5">
            <EmojiReactionBar
              reactions={reactionGroups}
              onReact={handleReactEmoji}
              onUnreact={handleUnreactEmoji}
            />
            {!hideReplyButton && (
              <button
                type="button"
                onClick={handleReplyClick}
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
            {onCreateIssue && (
              <button
                type="button"
                onClick={handleCreateIssue}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center gap-1"
                aria-label="Create new issue from comment"
              >
                <CirclePlus className="h-3 w-3" />
                New issue
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
                      This will permanently delete the comment and all replies. This cannot be
                      undone.
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
                onClick={handleReplySubmitClick}
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

export const CommentItem = memo(CommentItemComponent);
