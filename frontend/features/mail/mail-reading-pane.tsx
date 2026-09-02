"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import type { AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useMailThread,
  useMailMessage,
  useMailAction,
  useMailThreadSummary,
  useMailAiDraft,
} from "@/hooks/api/mail";
import { MailThreadMessage } from "./mail-thread-message";
import { MailReadingToolbar } from "./mail-reading-toolbar";
import {
  buildMailReadingAiActions,
  type MailReplyParams,
} from "./mail-reading-ai-actions";
import type {
  MailMessageSummary,
  MailMessageDetail,
} from "@/types/mail";

export type { MailReplyParams };

export interface MailReadingPaneProps {
  selectedMessage: MailMessageSummary;
  onBack?: () => void;
  onReply: (params: MailReplyParams) => void;
}

export function MailReadingPane({
  selectedMessage,
  onBack,
  onReply,
}: MailReadingPaneProps) {
  const threadId = selectedMessage.threadId ?? undefined;
  const accountId = selectedMessage.accountId;

  const {
    data: threadMessages,
    isLoading: threadLoading,
    isError: threadError,
    error: threadErr,
    refetch: retryThread,
  } = useMailThread(accountId, threadId);

  const {
    data: singleMessage,
    isLoading: singleLoading,
    isError: singleError,
    error: singleErr,
    refetch: retrySingle,
  } = useMailMessage(accountId, threadId ? undefined : selectedMessage.id);

  const mailAction = useMailAction();
  const threadSummaryMutation = useMailThreadSummary();
  const aiDraftMutation = useMailAiDraft();
  const canAi = useCan("mail:ai:use");

  const isLoading = threadId ? threadLoading : singleLoading;
  const isError = threadId ? threadError : singleError;
  const errorVal = threadId ? threadErr : singleErr;
  const retry = threadId ? retryThread : retrySingle;

  const messages: MailMessageDetail[] = useMemo(() => {
    if (threadId && threadMessages) return threadMessages;
    if (!threadId && singleMessage) return [singleMessage];
    return [];
  }, [threadId, threadMessages, singleMessage]);

  const latestMessage = messages[messages.length - 1];

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (latestMessage) return new Set([latestMessage.id]);
    return new Set<string>();
  });

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleReply = useCallback(() => {
    if (!latestMessage) return;
    const subject = selectedMessage.subject.startsWith("Re:")
      ? selectedMessage.subject
      : `Re: ${selectedMessage.subject}`;
    onReply({
      accountId,
      toEmail: latestMessage.from.email,
      subject,
      threadId,
      messageId: latestMessage.id,
    });
  }, [latestMessage, onReply, accountId, selectedMessage.subject, threadId]);

  const handleArchive = useCallback(() => {
    mailAction.mutate(
      {
        messageId: selectedMessage.id,
        body: { accountId, action: "archive", ...(threadId && { threadId }) },
      },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }, [mailAction, selectedMessage.id, accountId, threadId]);

  const handleTrash = useCallback(() => {
    mailAction.mutate(
      {
        messageId: selectedMessage.id,
        body: { accountId, action: "trash", ...(threadId && { threadId }) },
      },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }, [mailAction, selectedMessage.id, accountId, threadId]);

  const handleMarkUnread = useCallback(() => {
    mailAction.mutate(
      {
        messageId: selectedMessage.id,
        body: {
          accountId,
          action: "markUnread",
          ...(threadId && { threadId }),
        },
      },
      {
        onSuccess: () => toast.success("Marked as unread"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [mailAction, selectedMessage.id, accountId, threadId]);

  const handleToggleStar = useCallback(() => {
    mailAction.mutate(
      {
        messageId: selectedMessage.id,
        body: {
          accountId,
          action: selectedMessage.isStarred ? "unstar" : "star",
          ...(threadId && { threadId }),
        },
      },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }, [
    mailAction,
    selectedMessage.id,
    accountId,
    selectedMessage.isStarred,
    threadId,
  ]);

  const aiActions = useMemo<AiAction[]>(() => {
    if (!threadId) return [];
    return buildMailReadingAiActions({
      threadId,
      accountId,
      subject: selectedMessage.subject,
      latestMessage,
      onReply,
      summarize: (p) => threadSummaryMutation.mutateAsync(p),
      draft: (p) => aiDraftMutation.mutateAsync(p),
    });
  }, [
    threadId,
    accountId,
    selectedMessage.subject,
    latestMessage,
    onReply,
    threadSummaryMutation,
    aiDraftMutation,
  ]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3 rounded" />
          <Skeleton className="h-8 w-28 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      </div>
    );
  }

  const handleRetry = useCallback(() => { void retry(); }, [retry]);

  if (isError) {
    return (
      <ErrorState
        className="flex-1 m-4"
        compact
        title="Couldn't load message"
        description={getErrorMessage(errorVal)}
        onRetry={handleRetry}
      />
    );
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        illustrationPreset="mail"
        title="Message not found"
        description="This message may have been moved or deleted."
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-border/40 px-4 py-3 bg-card/60">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs mb-2 -ml-1 md:hidden"
            onClick={onBack}
          >
            ← Back
          </Button>
        )}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
              {selectedMessage.subject || "(no subject)"}
            </h2>
            <p className="mt-1 text-dense text-muted-foreground">
              {messages.length > 1
                ? `${messages.length} messages in thread`
                : "Single message"}
              {canAi && threadId ? " · AI assist available" : null}
            </p>
          </div>
          <MailReadingToolbar
            message={selectedMessage}
            onReply={handleReply}
            onArchive={handleArchive}
            onTrash={handleTrash}
            onMarkUnread={handleMarkUnread}
            onToggleStar={handleToggleStar}
            aiActions={aiActions}
            canAi={canAi}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {messages.map((msg, index) => (
          <MailThreadMessage
            key={msg.id}
            message={msg}
            isExpanded={
              expandedIds.has(msg.id) || index === messages.length - 1
            }
            isLatest={index === messages.length - 1}
            onToggle={handleToggleExpand}
          />
        ))}
      </div>
    </div>
  );
}
