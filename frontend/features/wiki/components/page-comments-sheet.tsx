"use client";

import { useState } from "react";
import {
  KbCheckIcon,
  KbEdit2Icon,
  KbMessageSquareIcon,
  KbXIcon,
} from "@/features/wiki/lib/kb-icons";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useKbPageComments,
  useCreateKbPageComment,
  useUpdateKbPageComment,
  useDeleteKbPageComment,
  useResolveKbPageComment,
} from "@/hooks/api/kb";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import type { KbPageComment } from "@/hooks/api/kb/page-comments";

interface CommentRowProps {
  comment: KbPageComment;
  replies: KbPageComment[];
  pageId: number;
  onReply: (comment: KbPageComment) => void;
}

function CommentRow({ comment, replies, pageId, onReply }: CommentRowProps) {
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
        onError: () => toast.error("Failed to update comment"),
      }
    );
  }

  function handleDelete() {
    deleteComment.mutate(
      { commentId: comment.id, pageId },
      { onError: () => toast.error("Failed to delete comment") }
    );
  }

  function handleResolve() {
    resolveComment.mutate(
      { commentId: comment.id, pageId },
      { onError: () => toast.error("Failed to resolve comment") }
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
          {editing ? (
            <div className="space-y-2">
              <Textarea
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
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleReplyClick}
              >
                Reply
              </button>
              {!isResolved && (
                <button
                  className="text-xs text-muted-foreground hover:text-status-success-ink transition-colors"
                  onClick={handleResolve}
                >
                  <KbCheckIcon className="h-3 w-3 inline mr-0.5" />
                  Resolve
                </button>
              )}
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleStartEdit}
              >
                <KbEdit2Icon className="h-3 w-3 inline mr-0.5" />
                Edit
              </button>
              <button
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                onClick={handleDelete}
              >
                <KbXIcon className="h-3 w-3 inline mr-0.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-8 space-y-3 border-l-2 border-border/40 pl-3">
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              replies={[]}
              pageId={pageId}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PageCommentsSheetProps {
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PageCommentsSheet({ pageId, open, onOpenChange }: PageCommentsSheetProps) {
  const { data: comments = [], isLoading } = useKbPageComments(pageId);
  const createComment = useCreateKbPageComment();
  const [newContent, setNewContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<KbPageComment | null>(null);

  const topLevel = comments.filter((c) => c.parentId === null && !c.resolvedAt);
  const resolved = comments.filter((c) => c.parentId === null && !!c.resolvedAt);

  function handlePost() {
    if (!newContent.trim()) return;
    createComment.mutate(
      { pageId, content: newContent.trim(), parentId: replyingTo?.id ?? null },
      {
        onSuccess: () => {
          setNewContent("");
          setReplyingTo(null);
        },
        onError: () => toast.error("Failed to post comment"),
      }
    );
  }

  function handleSetReplyingTo(comment: KbPageComment) {
    setReplyingTo(comment);
  }

  function handleClearReply() {
    setReplyingTo(null);
  }

  function handleNewContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNewContent(e.target.value);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 flex flex-col gap-0 sm:max-w-md">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <KbMessageSquareIcon className="h-4 w-4" />
            Comments
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4">
            {isLoading && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && topLevel.length === 0 && resolved.length === 0 && (
              <EmptyState
                title="No comments yet"
                description="Be the first to add a comment."
                compact
                className="flex-1 min-h-[40dvh]"
              />
            )}
            <div className="space-y-5">
              {topLevel.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  replies={comments.filter((c) => c.parentId === comment.id)}
                  pageId={pageId}
                  onReply={handleSetReplyingTo}
                />
              ))}
              {resolved.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">
                    Resolved ({resolved.length})
                  </p>
                  {resolved.map((comment) => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      replies={comments.filter((c) => c.parentId === comment.id)}
                      pageId={pageId}
                      onReply={handleSetReplyingTo}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </ScrollArea>
        <div className="shrink-0 border-t px-6 py-4 space-y-2">
          {replyingTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <span>Replying to comment…</span>
              <button
                type="button"
                aria-label="Cancel reply"
                onClick={handleClearReply}
                className="ml-auto hover:text-foreground transition-colors"
              >
                <KbXIcon className="h-3 w-3" />
              </button>
            </div>
          )}
          <Textarea
            value={newContent}
            onChange={handleNewContentChange}
            placeholder="Write a comment…"
            className="resize-none min-h-[80px] text-sm"
          />
          <div className="flex justify-end">
            <LoadingButton
              onClick={handlePost}
              disabled={!newContent.trim()}
              isPending={createComment.isPending}
              loadingText="Posting…"
            >
              Post comment
            </LoadingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
