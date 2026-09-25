"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KbCheckIcon, KbEdit2Icon, KbXIcon } from "@/features/wiki/lib/kb-icons";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUpdateKbPageComment, useDeleteKbPageComment, useResolveKbPageComment } from "@/hooks/api/kb";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import type { KbPageComment } from "@/hooks/api/kb/page-comments";

interface PageCommentThreadProps {
  comment: KbPageComment;
  replies: KbPageComment[];
  pageId: number;
  onReply: (comment: KbPageComment) => void;
  currentUserId: string | null | undefined;
  canUpdate: boolean;
}

export function PageCommentThread({ comment, replies, pageId, onReply, currentUserId, canUpdate }: PageCommentThreadProps) {
  const isAuthor = Boolean(comment.authorId && comment.authorId === currentUserId);
  const canEdit = isAuthor || canUpdate;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const updateComment = useUpdateKbPageComment();
  const deleteComment = useDeleteKbPageComment();
  const resolveComment = useResolveKbPageComment();

  function handleStartEdit() {
    setEditText(comment.content);
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
  }

  function handleSaveEdit() {
    updateComment.mutate(
      { commentId: comment.id, pageId, content: editText },
      {
        onSuccess: () => setEditing(false),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }

  function handleDelete() {
    deleteComment.mutate(
      { commentId: comment.id, pageId },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );
  }

  function handleResolve() {
    resolveComment.mutate(
      { commentId: comment.id, pageId },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );
  }

  function handleEditTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditText(e.target.value);
  }

  function handleReplyClick() {
    onReply(comment);
  }

  const isResolved = !!comment.resolvedAt;

  return (
    <div className={`space-y-2 ${isResolved ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
          {(comment.authorName ?? "?")[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-label font-medium">{comment.authorName ?? "Unknown"}</span>
            <span className="text-xs text-muted-foreground">{kbTimeAgo(comment.createdAt)}</span>
            {isResolved && (
              <Badge variant="secondary" className="text-micro h-4 px-1.5 py-0">
                Resolved
              </Badge>
            )}
          </div>
          {comment.anchorQuote && (
            <blockquote className="mb-1 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
              {comment.anchorQuote}
            </blockquote>
          )}
          {editing ? (
            <div className="space-y-2">
              <Textarea
                aria-label="Edit comment"
                value={editText}
                onChange={handleEditTextChange}
                className="text-sm resize-none min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateComment.isPending}
                  className="text-xs"
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          )}
          {!editing && (
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleReplyClick}
              >
                Reply
              </button>
              {!isResolved && canUpdate && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-status-success-ink transition-colors"
                  onClick={handleResolve}
                >
                  <KbCheckIcon className="h-3 w-3 inline mr-0.5" />
                  Resolve
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleStartEdit}
                >
                  <KbEdit2Icon className="h-3 w-3 inline mr-0.5" />
                  Edit
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  onClick={handleDelete}
                >
                  <KbXIcon className="h-3 w-3 inline mr-0.5" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <ul className="ml-8 space-y-3 border-l-2 border-border/40 pl-3">
          {replies.map((reply) => (
            <li key={reply.id}>
              <PageCommentThread
                comment={reply}
                replies={[]}
                pageId={pageId}
                onReply={onReply}
                currentUserId={currentUserId}
                canUpdate={canUpdate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
