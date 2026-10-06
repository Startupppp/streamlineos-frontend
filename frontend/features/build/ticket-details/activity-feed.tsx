"use client";

import { Button } from "@/components/ui/button";
import { ErrorReference } from "@/components/shared/error-reference";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { SendIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AiActionsMenu } from "@/components/ai/ai-actions-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TicketComment } from "@/types/projects";
import { MentionTextarea, type MentionUser } from "@/features/build/comments/mention-textarea";
import { CommentItem } from "./comment-item";
import { useActivityFeed } from "./use-activity-feed";

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
    newComment, setNewComment, composerReady, draftLoading, draftLoadError,
    draftPersistenceStatus, draftPersistenceError,
    canUpdate, canCreate, canAi,
    currentUserId, commentRefs,
    replyingTo, replyText, setReplyText,
    editingSaveId, deletingId,
    commentNotFound,
    addComment, addReply,
    repliesMap, sortedTopLevel, visibleTopLevel,
    commentPermalink,
    draftAction,
    handleSubmit, handleReplySubmit, handleSaveEdit, handleDeleteComment,
    handleTopKeyDown, handleReplyKeyDown, handleReply, handleReact, handleUnreact,
    handleCancelReply, handleDismissNotFound, handleCreateIssue,
    handleRetryDraft, handleRetryPersistence,
    handleShowOlderComments,
  } = useActivityFeed({ ticketId, projectId, projectKey, ticketNumber, comments, members, highlightCommentId });

  return (
    <div className="w-full space-y-4">
      <div className="flex w-full flex-1 min-w-0 flex-col gap-2">
        <h4 className="flex min-w-0 flex-1 items-center gap-1.5 text-dense font-medium uppercase tracking-wide text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Activity</span>
          {comments.length > 0 && (
            <span className="shrink-0 text-muted-foreground">({comments.length})</span>
          )}
          {activityAiActions}
          {canAi ? <AiActionsMenu actions={[draftAction]} triggerLabel="Draft comment" align="end" /> : null}
        </h4>

        {canUpdate && composerReady ? (
          <div className="flex w-full min-w-0 flex-row items-end gap-2">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              onKeyDown={handleTopKeyDown}
              placeholder="Write a comment... (Ctrl+Enter to send)"
              wrapperClassName="flex-1 min-w-0"
              className="min-h-[80px] text-sm"
              users={members}
            />
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
        {canUpdate && draftLoading ? <p role="status" className="text-xs text-muted-foreground">Loading saved draft…</p> : null}
        {canUpdate && draftPersistenceStatus ? <p role="status" className="text-xs text-muted-foreground">{draftPersistenceStatus}</p> : null}
        {canUpdate && draftPersistenceError ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{getErrorMessage(draftPersistenceError)}</span>
            <ErrorReference error={draftPersistenceError} />
            <Button type="button" variant="outline" size="sm" onClick={handleRetryPersistence}>Retry saving draft</Button>
          </div>
        ) : null}
        {canUpdate && draftLoadError ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
            <span>{"Couldn't load the saved draft. Try again, or start a new comment."}</span>
            <Button type="button" variant="outline" size="sm" onClick={handleRetryDraft}>Retry</Button>
          </div>
        ) : null}
      </div>

      {commentNotFound && (
        <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2.5 text-xs text-status-warning-ink-strong">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-status-warning-ink" />
          <span className="flex-1">Comment not found — it may have been deleted.</span>
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
                    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
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
                          onCreateIssue={canCreate ? handleCreateIssue : undefined}
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
          {canUpdate ? "No comments yet. Be the first to comment." : "No comments yet."}
        </p>
      )}
    </div>
  );
}
