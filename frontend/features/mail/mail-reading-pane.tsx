"use client";

import { useState, useCallback, useMemo, forwardRef } from "react";
import { format, parseISO, isToday, isThisYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import {
  ReplyIcon,
  StarIcon,
  Trash2Icon,
  DownloadIcon,
} from "@animateicons/react/lucide";
import {
  Archive,
  Paperclip,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  MailOpen,
} from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import {
  useMailThread,
  useMailMessage,
  useMailAction,
  useMailThreadSummary,
  useMailAiDraft,
} from "@/hooks/api/mail";
import { MailHtmlViewer } from "./mail-html-viewer";
import type {
  MailMessageSummary,
  MailMessageDetail,
  MailAccount,
} from "@/types/mail";

function formatDetailDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d, h:mm a");
  return format(date, "MMM d, yyyy, h:mm a");
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentChipProps {
  attachmentId: string;
  messageId: string;
  accountId: number;
  fileName: string;
  sizeBytes: number | null;
}

const AttachmentChip = forwardRef<HTMLButtonElement, AttachmentChipProps>(
  function AttachmentChip(
    { attachmentId, messageId, accountId, fileName, sizeBytes },
    _ref,
  ) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();

    const handleDownload = useCallback(async () => {
      try {
        const data = await apiClient.get<{
          downloadUrl: string;
          fileName: string;
        }>(
          `/mail/messages/${messageId}/attachments/${attachmentId}?accountId=${accountId}&fileName=${encodeURIComponent(fileName)}`,
        );
        window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    }, [attachmentId, messageId, accountId, fileName]);

    const handleClick = useCallback(() => {
      void handleDownload();
    }, [handleDownload]);

    return (
      <button
        type="button"
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/40 text-[11px] text-foreground/80 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[200px]"
        onClick={handleClick}
        {...hoverHandlers}
        aria-label={`Download ${fileName}`}
      >
        <Paperclip
          className="h-3 w-3 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="truncate min-w-0">{fileName}</span>
        {sizeBytes != null && (
          <span className="text-muted-foreground shrink-0">
            {formatBytes(sizeBytes)}
          </span>
        )}
        <DownloadIcon
          ref={iconRef}
          size={11}
          className="shrink-0 text-muted-foreground"
        />
      </button>
    );
  },
);

interface MessageCardProps {
  message: MailMessageDetail;
  isExpanded: boolean;
  isLatest: boolean;
  onToggle: (id: string) => void;
}

function MessageCard({
  message,
  isExpanded,
  isLatest,
  onToggle,
}: MessageCardProps) {
  const senderLabel = message.from.name ?? message.from.email;
  const recipientsLabel = [
    ...message.to.map((a) => a.name ?? a.email),
    ...(message.cc ?? []).map((a) => a.name ?? a.email),
  ].join(", ");

  const handleToggle = useCallback(
    () => onToggle(message.id),
    [message.id, onToggle],
  );

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={handleToggle}
        aria-label={`Expand message from ${senderLabel}`}
      >
        <ChevronRight
          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
          aria-hidden
        />
        <span className="text-[12px] font-medium text-foreground/80 shrink-0">
          {senderLabel}
        </span>
        <TruncatedText
          text={message.snippet}
          className="text-[11px] text-muted-foreground flex-1 min-w-0"
        />
        <span className="text-[11px] text-muted-foreground shrink-0 font-mono tabular-nums">
          {formatDetailDate(message.date)}
        </span>
      </button>
    );
  }

  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        type="button"
        className={cn(
          "w-full flex items-start gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
          !isLatest && "hover:bg-muted/20 cursor-pointer",
          isLatest && "cursor-default",
        )}
        onClick={isLatest ? undefined : handleToggle}
        aria-label={
          isLatest ? undefined : `Collapse message from ${senderLabel}`
        }
      >
        <ChevronDown
          className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">
              {senderLabel}
            </span>
            <span className="text-[11px] text-muted-foreground shrink-0 font-mono tabular-nums">
              {formatDetailDate(message.date)}
            </span>
          </div>
          {recipientsLabel && (
            <TruncatedText
              text={`To: ${recipientsLabel}`}
              className="text-[11px] text-muted-foreground mt-0.5"
            />
          )}
        </div>
      </button>

      <div className="px-4 pb-4">
        {message.bodyHtml ? (
          <MailHtmlViewer html={message.bodyHtml} className="mt-1" />
        ) : message.bodyText ? (
          <pre className="text-[13px] text-foreground whitespace-pre-wrap font-sans break-words">
            {message.bodyText}
          </pre>
        ) : (
          <p className="text-[12px] text-muted-foreground italic">No content</p>
        )}

        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/20">
            {message.attachments.map((att) => (
              <AttachmentChip
                key={att.id}
                attachmentId={att.id}
                messageId={message.id}
                accountId={message.accountId}
                fileName={att.fileName}
                sizeBytes={att.sizeBytes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ReadingPaneToolbarProps {
  message: MailMessageSummary;
  onReply: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onMarkUnread: () => void;
  onToggleStar: () => void;
  aiActions: AiAction[];
  canAi: boolean;
}

const ReadingPaneToolbar = forwardRef<HTMLDivElement, ReadingPaneToolbarProps>(
  function ReadingPaneToolbar(
    {
      message,
      onReply,
      onArchive,
      onTrash,
      onMarkUnread,
      onToggleStar,
      aiActions,
      canAi,
    },
    _ref,
  ) {
    const { iconRef: starRef, hoverHandlers: starHover } = useAnimatedIcon();

    const handleArchiveClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onArchive();
      },
      [onArchive],
    );

    const handleUnreadClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onMarkUnread();
      },
      [onMarkUnread],
    );

    const handleStarClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleStar();
      },
      [onToggleStar],
    );

    return (
      <div className="flex items-center gap-1 shrink-0">
        <AnimatedIconButton
          icon={ReplyIcon}
          iconSize={14}
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={onReply}
          aria-label="Reply"
        >
          Reply
        </AnimatedIconButton>

        <button
          type="button"
          className="flex items-center justify-center h-8 w-8 rounded-md border border-input bg-card hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={handleArchiveClick}
          aria-label="Archive"
        >
          <Archive className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </button>

        <AnimatedIconButton
          icon={Trash2Icon}
          iconSize={14}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onTrash}
          aria-label="Move to trash"
        />

        <button
          type="button"
          className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={handleUnreadClick}
          aria-label="Mark as unread"
          title="Mark as unread"
        >
          <MailOpen className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </button>

        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            message.isStarred ? "text-amber-500" : "text-muted-foreground",
          )}
          onClick={handleStarClick}
          aria-label={message.isStarred ? "Unstar" : "Star"}
          {...starHover}
        >
          <StarIcon ref={starRef} size={14} />
        </button>

        {canAi && aiActions.length > 0 && (
          <AiActionsMenu
            actions={aiActions}
            triggerLabel="AI"
            menuLabel="AI assist"
            align="end"
          />
        )}
      </div>
    );
  },
);

export interface MailReplyParams {
  accountId: number;
  toEmail: string;
  subject: string;
  threadId?: string;
  messageId: string;
  prefillBody?: string;
}

export interface MailReadingPaneProps {
  selectedMessage: MailMessageSummary;
  accounts: MailAccount[];
  onBack?: () => void;
  onReply: (params: MailReplyParams) => void;
}

export function MailReadingPane({
  selectedMessage,
  accounts: _accounts,
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

    async function runThreadSummary() {
      const data = await threadSummaryMutation.mutateAsync({
        accountId,
        threadId: threadId!,
      });
      const parts = [
        data.summary,
        data.actionItems.length
          ? "Action items:\n" +
            data.actionItems.map((item) => `• ${item}`).join("\n")
          : "",
      ].filter(Boolean);
      return { text: parts.join("\n\n") };
    }

    async function runDraftReply() {
      const data = await aiDraftMutation.mutateAsync({
        mode: "reply",
        instruction: "Write a professional reply to this email thread.",
        accountId,
        threadId,
      });
      return { text: data.bodyHtml };
    }

    function applyDraftReply(text: string) {
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
        prefillBody: text,
      });
    }

    return [
      {
        key: "thread-summary",
        label: "Summarize thread",
        description: "AI summary + action items",
        run: runThreadSummary,
      },
      {
        key: "draft-reply",
        label: "Draft reply",
        description: "AI-generated reply draft",
        run: runDraftReply,
        onApply: applyDraftReply,
        applyLabel: "Open in composer",
      },
    ];
  }, [
    threadId,
    accountId,
    threadSummaryMutation,
    aiDraftMutation,
    latestMessage,
    onReply,
    selectedMessage.subject,
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

  if (isError) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center gap-3 p-6">
        <AlertCircle className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground text-center">
          {getErrorMessage(errorVal)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void retry()}
          className="h-8 text-xs"
        >
          Retry
        </Button>
      </div>
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
      <div className="shrink-0 border-b border-border/40 px-4 py-3 bg-card/50">
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
          <h2 className="text-sm font-semibold text-foreground leading-tight min-w-0 line-clamp-2 flex-1">
            {selectedMessage.subject || "(no subject)"}
          </h2>
          <ReadingPaneToolbar
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
        {messages.length > 1 && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {messages.length} messages in thread
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {messages.map((msg, index) => (
          <MessageCard
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
