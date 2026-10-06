"use client";

import { useState, useCallback, useEffect, memo } from "react";
import dynamic from "next/dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { SendIcon, XIcon } from "@animateicons/react/lucide";
import { resolveImageUrl } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import type { TicketComment } from "@/types/projects";
import { MentionTextarea, type MentionUser } from "@/features/build/comments/mention-textarea";
import { groupReactions, CommentActionBar } from "./comment-action-bar";
import { RichTextContent } from "@/components/editor/rich-text-content";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[60px]" />
    ),
  },
);

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
  canInteract: boolean;
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
  canInteract,
  onSaveEdit,
  onDelete,
  isSavingEdit,
  isDeletingComment,
  onCreateIssue,
}: CommentItemProps) {
  const user = comment.user;
  const timeAgo = formatRelativeTime(comment.createdAt);
  const isEdited =
    comment.updatedAt &&
    comment.createdAt &&
    new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();

  const isAuthor = !!currentUserId && (comment.userId === currentUserId || user?.id === currentUserId);
  const canDelete = canInteract && isAuthor;
  const reactionGroups = groupReactions(comment.reactions ?? [], currentUserId);

  const [highlightExpired, setHighlightExpired] = useState(false);
  useEffect(() => {
    if (!isHighlighted) return;
    const timer = setTimeout(() => setHighlightExpired(true), 2500);
    return () => {
      clearTimeout(timer);
      setHighlightExpired(false);
    };
  }, [isHighlighted]);
  const showHighlight = isHighlighted && !highlightExpired;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

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
      className={`flex gap-2.5 group rounded-lg transition-colors duration-500 ${showHighlight ? "bg-primary/5 ring-1 ring-primary/20 px-2 -mx-2 py-1" : ""}`}
    >
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarImage src={resolveImageUrl(user?.image)} />
        <AvatarFallback className="text-micro bg-primary/10 text-primary">
          {getUserInitials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 max-w-full flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-xs font-medium">
            {getUserDisplayName(user)}
          </span>
          <span className="shrink-0 text-dense text-muted-foreground">{timeAgo}</span>
          {isEdited && (
            <span className="text-micro text-muted-foreground italic">(edited)</span>
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
                className="px-2 text-xs"
                disabled={isSavingEdit}
              >
                <XIcon size={12} className="mr-1" />
                Cancel
              </Button>
              <LoadingButton
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                isPending={isSavingEdit}
                className="px-2 text-xs"
              >
                {!isSavingEdit && <SendIcon size={12} className="mr-1" />}
                Save
              </LoadingButton>
            </div>
          </div>
        ) : (
          <RichTextContent
            content={comment.content}
            contentKey={comment.id}
            className="mt-0.5 max-w-full"
          />
        )}

        {!isEditing && (
          <CommentActionBar
            canInteract={canInteract}
            hideReplyButton={hideReplyButton}
            permalinkUrl={permalinkUrl}
            isAuthor={isAuthor}
            canDelete={canDelete}
            isDeletingComment={isDeletingComment}
            reactionGroups={reactionGroups}
            onReact={handleReactEmoji}
            onUnreact={handleUnreactEmoji}
            onReply={handleReplyClick}
            onStartEdit={handleStartEdit}
            onDeleteConfirm={handleDeleteConfirm}
            onCreateIssue={onCreateIssue ? handleCreateIssue : undefined}
          />
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
                className="px-2 text-xs"
              >
                Cancel
              </Button>
              <LoadingButton
                size="sm"
                onClick={handleReplySubmitClick}
                disabled={!replyText.trim()}
                isPending={isReplyPending}
                className="px-2 text-xs"
              >
                {!isReplyPending && <SendIcon size={12} className="mr-1" />}
                Reply
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const CommentItem = memo(CommentItemComponent);
