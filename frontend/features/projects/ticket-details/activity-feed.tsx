"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { useAddComment } from "@/hooks/api/projects";
import { useAddReaction, useRemoveReaction } from "@/hooks/api/projects/reactions";
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

export function ActivityFeed({ ticketId, projectId = 0, comments, members = [] }: ActivityFeedProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

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
            <div key={comment.id}>
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
                      <CommentItem
                        key={reply.id}
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
                      />
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
}: CommentItemProps) {
  const user = comment.user as TicketUser | undefined;
  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
    : "";

  const reactionGroups = groupReactions(comment.reactions ?? [], currentUserId);

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
          {formatMentionText(comment.content)}
        </p>
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
              className="text-[11px] text-muted-foreground hover:text-violet-600 transition-colors opacity-0 group-hover:opacity-100"
            >
              Reply
            </button>
          )}
        </div>
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
