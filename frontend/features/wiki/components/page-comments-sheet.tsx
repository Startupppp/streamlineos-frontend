"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  KbMessageSquareIcon,
  KbXIcon,
} from "@/features/wiki/lib/kb-icons";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useKbPageComments,
  useCreateKbPageComment,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageComment } from "@/hooks/api/kb/page-comments";
import { PageCommentThread } from "./page-comment-thread";

interface PageCommentsSheetProps {
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PageCommentsSheet({ pageId, open, onOpenChange }: PageCommentsSheetProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const canUpdate = useCan("kb:pages:update");
  const { data: comments = [], isLoading, isError, error, refetch } = useKbPageComments(pageId);
  const createComment = useCreateKbPageComment();
  const [newContent, setNewContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<KbPageComment | null>(null);
  const [postAnnouncement, setPostAnnouncement] = useState("");

  const topLevel = comments.filter((c) => c.parentId === null && !c.resolvedAt);
  const resolved = comments.filter((c) => c.parentId === null && !!c.resolvedAt);

  function handlePost() {
    if (!newContent.trim()) return;
    const isReply = replyingTo !== null;
    createComment.mutate(
      { pageId, content: newContent.trim(), parentId: replyingTo?.id ?? null },
      {
        onSuccess: () => {
          setNewContent("");
          setReplyingTo(null);
          setPostAnnouncement(isReply ? "Reply posted." : "Comment posted.");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
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

  function handleRetryComments() {
    void refetch();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 flex flex-col gap-0 sm:max-w-md">
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {postAnnouncement}
        </div>
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <KbMessageSquareIcon className="h-4 w-4" />
            Comments
          </SheetTitle>
          <SheetDescription>Discuss this page and resolve feedback with your team.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4">
            {isError && (
              <ErrorState
                title="Couldn't load comments"
                description={getErrorMessage(error)}
                onRetry={handleRetryComments}
                compact
              />
            )}
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
            {!isLoading && !isError && topLevel.length === 0 && resolved.length === 0 && (
              <EmptyState
                title="No comments yet"
                description="Be the first to add a comment."
                compact
                className="flex-1 min-h-[40dvh]"
              />
            )}
            <div className="space-y-5">
              <ul role="list" className="space-y-5">
                {topLevel.map((comment) => (
                  <li key={comment.id} role="listitem">
                    <PageCommentThread
                      comment={comment}
                      replies={comments.filter((c) => c.parentId === comment.id)}
                      pageId={pageId}
                      onReply={handleSetReplyingTo}
                      currentUserId={currentUserId}
                      canUpdate={canUpdate}
                    />
                  </li>
                ))}
              </ul>
              {resolved.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">
                    Resolved ({resolved.length})
                  </p>
                  <ul role="list" className="space-y-5">
                    {resolved.map((comment) => (
                      <li key={comment.id} role="listitem">
                        <PageCommentThread
                          comment={comment}
                          replies={comments.filter((c) => c.parentId === comment.id)}
                          pageId={pageId}
                          onReply={handleSetReplyingTo}
                          currentUserId={currentUserId}
                          canUpdate={canUpdate}
                        />
                      </li>
                    ))}
                  </ul>
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
            aria-label={replyingTo ? "Reply to comment" : "Write a comment"}
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
