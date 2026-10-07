"use client";

import { useCallback } from "react";
import { Pencil } from "lucide-react";
import { LinkIcon, Trash2Icon, CirclePlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmojiReactionBar, type ReactionGroup } from "@/features/build/comments/emoji-reaction-bar";
import type { CommentReaction } from "@/types/projects";

export function groupReactions(
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

interface CommentActionBarProps {
  canInteract: boolean;
  hideReplyButton: boolean;
  permalinkUrl?: string;
  isAuthor: boolean;
  canDelete: boolean;
  isDeletingComment: boolean;
  reactionGroups: ReactionGroup[];
  onReact: (emoji: string) => void;
  onUnreact: (emoji: string) => void;
  onReply: () => void;
  onStartEdit: () => void;
  onDeleteConfirm: () => void;
  onCreateIssue?: () => void;
}

export function CommentActionBar({
  canInteract,
  hideReplyButton,
  permalinkUrl,
  isAuthor,
  canDelete,
  isDeletingComment,
  reactionGroups,
  onReact,
  onUnreact,
  onReply,
  onStartEdit,
  onDeleteConfirm,
  onCreateIssue,
}: CommentActionBarProps) {
  const handleCopyLink = useCallback(() => {
    if (!permalinkUrl) return;
    navigator.clipboard.writeText(window.location.origin + permalinkUrl).then(() => {
      toast.success("Link copied");
    });
  }, [permalinkUrl]);

  return (
    <div className="flex min-h-0 items-center gap-3 mt-0.5">
      {canInteract ? (
        <EmojiReactionBar
          reactions={reactionGroups}
          onReact={onReact}
          onUnreact={onUnreact}
        />
      ) : null}
      {canInteract && !hideReplyButton && (
        <button
          type="button"
          onClick={onReply}
          className="text-dense text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          Reply
        </button>
      )}
      {permalinkUrl && (
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-dense text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center gap-1"
          aria-label="Copy comment link"
        >
          <LinkIcon size={12} />
          Copy link
        </button>
      )}
      {onCreateIssue && (
        <button
          type="button"
          onClick={onCreateIssue}
          className="text-dense text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center gap-1"
          aria-label="Create new issue from comment"
        >
          <CirclePlusIcon size={12} />
          New issue
        </button>
      )}
      {canInteract && isAuthor && (
        <button
          type="button"
          onClick={onStartEdit}
          className="text-dense text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center gap-1"
          aria-label="Edit comment"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      )}
      {canDelete && (
        <ConfirmDialog
          trigger={
            <button
              type="button"
              className="text-dense text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
              aria-label="Delete comment"
              disabled={isDeletingComment}
            >
              <Trash2Icon size={12} />
              Delete
            </button>
          }
          title="Delete comment?"
          description="This will permanently delete the comment and all replies. This cannot be undone."
          confirmLabel="Delete"
          destructive
          isPending={isDeletingComment}
          onConfirm={onDeleteConfirm}
        />
      )}
    </div>
  );
}

