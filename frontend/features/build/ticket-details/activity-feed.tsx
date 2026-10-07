"use client";

import { ErrorReference } from "@/components/shared/error-reference";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { useRef } from "react";
import { PaperclipIcon, SendIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AiActionsMenu } from "@/components/ai/ai-actions-menu";
import type { TicketComment } from "@/types/projects";
import {
  MentionTextarea,
  type MentionUser,
} from "@/features/build/comments/mention-textarea";
import { CommentItem } from "./comment-item";
import { useActivityFeed } from "./use-activity-feed";
import { getErrorMessage } from "@/lib/get-error-message";

const noopVoid = () => {};
const noopStr = (_: string) => {};

interface ActivityFeedProps {
  ticketId: number;
  projectId: number;
  projectKey?: string | null;
  ticketNumber?: number | null;
  comments: TicketComment[];
  members?: MentionUser[];
  highlightCommentId?: number | null;
  activityAiActions?: React.ReactNode;
}

export function ActivityFeed({
  ticketId,
  projectId,
  projectKey,
  ticketNumber,
  comments,
  members = [],
  highlightCommentId,
  activityAiActions,
}: ActivityFeedProps) {
  const {
    newComment,
    setNewComment,
    composerReady,
    draftLoading,
    draftLoadError,
    draftPersistenceStatus,
    draftPersistenceError,
    canUpdate,
    canCreate,
    canAi,
    currentUserId,
    commentRefs,
    replyingTo,
    replyText,
    setReplyText,
    editingSaveId,
    deletingId,
    commentNotFound,
    addComment,
    addReply,
    repliesMap,
    sortedTopLevel,
    visibleTopLevel,
    commentPermalink,
    draftAction,
    handleSubmit,
    handleReplySubmit,
    handleSaveEdit,
    handleDeleteComment,
    handleTopKeyDown,
    handleReplyKeyDown,
    handleReply,
    handleReact,
    handleUnreact,
    handleCancelReply,
    handleDismissNotFound,
    handleCreateIssue,
    handleRetryDraft,
    handleRetryPersistence,
    canAttachFiles,
    isAttachingFiles,
    handleAttachFiles,
    handleShowOlderComments,
  } = useActivityFeed({
    ticketId,
    projectId,
    projectKey,
    ticketNumber,
    comments,
    members,
    highlightCommentId,
  });
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  function handleChooseFiles() {
    attachmentInputRef.current?.click();
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) void handleAttachFiles(files);
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex w-full flex-1 min-w-0 flex-col gap-2">
        <h4 className="flex min-w-0 flex-1 items-center gap-1.5 pr-2 text-dense font-medium uppercase tracking-wide text-muted-foreground max-md:pr-14">
          <span className="flex min-w-0 items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Activity</span>
            {comments.length > 0 ? (
              <span className="shrink-0 text-muted-foreground">
                ({comments.length})
              </span>
            ) : null}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {activityAiActions}
            {canAi ? (
              <AiActionsMenu
                actions={[draftAction]}
                triggerLabel="Draft comment"
                triggerVariant="ghost"
                align="end"
              />
            ) : null}
          </span>
        </h4>

        {canUpdate && composerReady ? (
          <div className="flex w-full min-w-0 flex-row items-end gap-2">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              onKeyDown={handleTopKeyDown}
              placeholder="Write a comment... (Ctrl+Enter to send)"
              wrapperClassName="flex-1 min-w-0"
              className="min-h-[80px] border-border/70 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
              users={members}
            />
            {canAttachFiles ? (
              <>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                />
                <AnimatedIconButton
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  icon={PaperclipIcon}
                  iconSize={14}
                  className="shrink-0"
                  onClick={handleChooseFiles}
                  disabled={isAttachingFiles}
                  aria-label="Attach files to ticket"
                />
              </>
            ) : null}
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
        ) : null}
        {canUpdate && draftLoading ? (
          <p role="status" className="text-xs text-muted-foreground">
            Loading saved draft…
          </p>
        ) : null}
        {canUpdate && !draftPersistenceError && draftPersistenceStatus ? (
          <p role="status" className="text-xs text-muted-foreground">
            {draftPersistenceStatus}
          </p>
        ) : null}
        {canUpdate && draftPersistenceError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-1.5 text-xs text-destructive"
          >
            <span className="min-w-0 truncate" title={getErrorMessage(draftPersistenceError)}>
              Failed to save. {getErrorMessage(draftPersistenceError)}
            </span>
            <ErrorReference error={draftPersistenceError} />
            <button
              type="button"
              aria-label="Retry saving draft"
              className="font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={handleRetryPersistence}
            >
              Retry
            </button>
          </div>
        ) : null}
        {canUpdate && draftLoadError ? (
          <div
            className="flex min-w-0 items-center gap-2 text-xs text-destructive"
            role="alert"
          >
            <span className="min-w-0 flex-1 truncate">
              Couldn&apos;t load the saved draft. Try again, or start a new comment.
            </span>
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={handleRetryDraft}
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>

      {commentNotFound && (
        <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2.5 text-xs text-status-warning-ink-strong">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-status-warning-ink" />
          <span className="flex-1">
            Comment not found — it may have been deleted.
          </span>
          <button
            type="button"
            onClick={handleDismissNotFound}
            aria-label="Dismiss"
            className="shrink-0 text-status-warning-ink hover:text-status-warning-ink transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {sortedTopLevel.length > 0 && (
        <div className="space-y-3">
          {visibleTopLevel.map((comment) => (
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
                canInteract={canUpdate}
                onSaveEdit={handleSaveEdit}
                onDelete={handleDeleteComment}
                isSavingEdit={editingSaveId === comment.id}
                isDeletingComment={deletingId === comment.id}
                onCreateIssue={canCreate ? handleCreateIssue : undefined}
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
                          canInteract={canUpdate}
                          onSaveEdit={handleSaveEdit}
                          onDelete={handleDeleteComment}
                          isSavingEdit={editingSaveId === reply.id}
                          isDeletingComment={deletingId === reply.id}
                          onCreateIssue={
                            canCreate ? handleCreateIssue : undefined
                          }
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
          {sortedTopLevel.length > visibleTopLevel.length && (
            <button
              type="button"
              onClick={handleShowOlderComments}
              className="mx-auto block rounded-md border border-border bg-card px-3 py-1.5 text-xs font-normal text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              Show older comments
              <span className="ml-1 tabular-nums opacity-70">
                ({visibleTopLevel.length} of {sortedTopLevel.length})
              </span>
            </button>
          )}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {canUpdate
            ? "No comments yet. Be the first to comment."
            : "No comments yet."}
        </p>
      )}
    </div>
  );
}
