"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import type { AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useMailAction,
  useMailThreadSummary,
  useMailAiDraft,
} from "@/hooks/api/mail";
import { useMailThreadView } from "./mail-thread-view";
import { MailThreadMessage } from "./mail-thread-message";
import { MailReadingToolbar } from "./mail-reading-toolbar";
import { MailReadingPaneSkeleton } from "./mail-shell-skeletons";
import {
  buildMailReadingAiActions,
  type MailReplyParams,
} from "./mail-reading-ai-actions";
import type { MailMessageSummary } from "@/types/mail";

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

  const view = useMailThreadView({
    accountId,
    threadId,
    messageId: selectedMessage.id,
  });

  const mailAction = useMailAction();
  const threadSummaryMutation = useMailThreadSummary();
  const aiDraftMutation = useMailAiDraft();
  const canAi = useCan("mail:ai:use");

  const latestMessage = view.messages[view.messages.length - 1];

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

  const retryView = view.retry;
  const handleRetry = useCallback(() => { void retryView(); }, [retryView]);

  if (view.isLoading) {
    return <MailReadingPaneSkeleton />;
  }

  if (view.status === "error") {
    return (
      <ErrorState
        className="flex-1 m-4"
        compact
        title="Couldn't load message"
        description={getErrorMessage(view.error)}
        onRetry={handleRetry}
      />
    );
  }

  if (view.messages.length === 0) {
    return (
      <EmptyState
        illustrationPreset="mail"
        title="Message not found"
        description="This message may have been moved or deleted."
      />
    );
  }

  const isHydrating = view.status === "hydrating";

  return (
    <div
      className="flex h-full w-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden"
      data-testid="mail-reading-pane"
    >
      <div className="shrink-0 border-b border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-1 h-9 shrink-0 px-2 lg:px-2.5"
              onClick={onBack}
              aria-label="Back to messages"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden lg:inline">Back</span>
            </Button>
          ) : null}

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
              {selectedMessage.subject || "(no subject)"}
            </h2>
            <p className="mt-1 truncate text-dense text-muted-foreground">
              {view.messages.length > 1
                ? `${view.messages.length} messages in thread`
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

      <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto">
        {view.messages.map((msg, index) => (
          <MailThreadMessage
            key={msg.id}
            message={msg}
            isExpanded={
              expandedIds.has(msg.id) || index === view.messages.length - 1
            }
            isLatest={index === view.messages.length - 1}
            isHydrating={isHydrating}
            onToggle={handleToggleExpand}
          />
        ))}
      </div>
    </div>
  );
}
