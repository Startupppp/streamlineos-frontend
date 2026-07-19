"use client";

import { useState, type ChangeEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyTicketIllustration } from "@/components/illustrations";
import {
  useKbComments,
  useAddKbComment,
  useDeleteKbComment,
} from "@/hooks/api/support/kb-comments";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import type { KbArticleDetail } from "@/hooks/api/support/kb";

function getCommentInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface CommentItemProps {
  comment: {
    id: number;
    userImage?: string | null;
    userName?: string | null;
    createdAt?: string | null;
    body: string;
  };
  isPendingDelete: boolean;
  onDelete: (commentId: number) => void;
}

function CommentItem({ comment, isPendingDelete, onDelete }: CommentItemProps) {
  function handleDelete() {
    onDelete(comment.id);
  }
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage src={resolveImageUrl(comment.userImage)} />
            <AvatarFallback className="text-[8px]">
              {getCommentInitials(comment.userName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium truncate min-w-0">{comment.userName ?? "Unknown"}</span>
          {comment.createdAt && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        <AnimatedIconButton
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isPendingDelete}
          aria-label="Delete comment"
          icon={Trash2Icon}
        />
      </div>
      <p className="text-xs text-foreground mt-1 whitespace-pre-wrap break-words">
        {comment.body}
      </p>
    </div>
  );
}

export function KbCommentsPanel({ article }: { article: KbArticleDetail }) {
  const commentsQuery = useKbComments(article.id);
  const addComment = useAddKbComment(article.id);
  const deleteComment = useDeleteKbComment(article.id);
  const [draft, setDraft] = useState("");
  const comments = commentsQuery.data ?? [];

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  function handleAdd() {
    const body = draft.trim();
    if (!body) {
      toast.error("Comment cannot be empty");
      return;
    }
    addComment.mutate(body, {
      onSuccess: () => {
        setDraft("");
        toast.success("Comment added");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDelete(commentId: number) {
    deleteComment.mutate(commentId, {
      onSuccess: () => toast.success("Comment deleted"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleCommentsRetry() {
    void commentsQuery.refetch();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-muted-foreground" /> Internal Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={draft}
            onChange={handleDraftChange}
            placeholder="Add an internal note for your team…"
            className="text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={addComment.isPending || !draft.trim()}
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

        {commentsQuery.isLoading ? (
          <LoadingState variant="list" rows={8} />
        ) : commentsQuery.error ? (
          <ErrorState
            compact
            title="Couldn't load comments"
            description={getErrorMessage(commentsQuery.error)}
            onRetry={handleCommentsRetry}
          />
        ) : comments.length === 0 ? (
          <EmptyState
            illustration={<EmptyTicketIllustration />}
            title="No comments yet"
            description="Internal notes are only visible to your team."
            compact
          />
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isPendingDelete={deleteComment.isPending}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
