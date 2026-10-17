"use client";

import { useCallback, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Archive, Paperclip } from "lucide-react";
import { StarIcon, Trash2Icon, SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { format, isToday, isThisYear, parseISO } from "date-fns";
import { scoreNeedsYou } from "./mail-group-messages";
import type { MailFolder, MailMessageSummary } from "@/types/mail";

function formatMessageDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

export type MailListAction = "star" | "unstar" | "archive" | "trash";

interface StarButtonProps {
  messageId: string;
  accountId: number;
  isStarred: boolean;
  onAction: (
    messageId: string,
    accountId: number,
    action: "star" | "unstar",
    threadId?: string,
  ) => void;
  threadId?: string | null;
}

const StarButton = forwardRef<HTMLButtonElement, StarButtonProps>(
  function StarButton(
    { messageId, accountId, isStarred, onAction, threadId },
    _,
  ) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction(
          messageId,
          accountId,
          isStarred ? "unstar" : "star",
          threadId ?? undefined,
        );
      },
      [messageId, accountId, isStarred, onAction, threadId],
    );
    return (
      <button
        type="button"
        aria-label={isStarred ? "Unstar" : "Star"}
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isStarred
            ? "text-status-warning-ink"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={handleClick}
        {...hoverHandlers}
      >
        <StarIcon ref={iconRef} size={13} />
      </button>
    );
  },
);

interface QuickActionsProps {
  messageId: string;
  accountId: number;
  threadId?: string | null;
  folder: MailFolder;
  canAi: boolean;
  onAction: (
    messageId: string,
    accountId: number,
    action: "archive" | "trash",
    threadId?: string,
  ) => void;
  onAiBrief: (accountId: number, threadId: string) => void;
}

const QuickActions = forwardRef<HTMLDivElement, QuickActionsProps>(
  function QuickActions(
    { messageId, accountId, threadId, folder, canAi, onAction, onAiBrief },
    _,
  ) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    const handleArchive = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction(messageId, accountId, "archive", threadId ?? undefined);
      },
      [messageId, accountId, threadId, onAction],
    );
    const handleTrash = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction(messageId, accountId, "trash", threadId ?? undefined);
      },
      [messageId, accountId, threadId, onAction],
    );
    const handleAi = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (threadId) onAiBrief(accountId, threadId);
      },
      [accountId, threadId, onAiBrief],
    );

    if (folder === "archive" || folder === "trash") return null;

    return (
      <div className="flex items-center gap-0.5" data-slot="mail-quick-actions">
        {canAi && threadId && (
          <button
            type="button"
            aria-label="AI brief"
            className="flex items-center justify-center h-6 w-6 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={handleAi}
            {...hoverHandlers}
          >
            <SparklesIcon ref={iconRef} size={12} />
          </button>
        )}
        <button
          type="button"
          aria-label="Archive"
          className="flex items-center justify-center h-6 w-6 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={handleArchive}
        >
          <Archive className="h-3 w-3" aria-hidden />
        </button>
        <AnimatedIconButton
          icon={Trash2Icon}
          iconSize={13}
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={handleTrash}
          aria-label="Move to trash"
        />
      </div>
    );
  },
);

export interface MailMessageRowProps {
  message: MailMessageSummary;
  isSelected: boolean;
  folder: MailFolder;
  showPriority: boolean;
  canAi: boolean;
  onSelect: (message: MailMessageSummary) => void;
  onAction: (
    messageId: string,
    accountId: number,
    action: MailListAction,
    threadId?: string,
  ) => void;
  onAiBrief: (accountId: number, threadId: string) => void;
}

export function MailMessageRow({
  message,
  isSelected,
  folder,
  showPriority,
  canAi,
  onSelect,
  onAction,
  onAiBrief,
}: MailMessageRowProps) {
  const handleSelect = useCallback(
    () => onSelect(message),
    [message, onSelect],
  );
  const senderLabel = message.from.name ?? message.from.email;
  const priority = showPriority && scoreNeedsYou(message) >= 5;

  return (
    <div
      className={cn(
        "group grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-stretch border-b border-border/40 border-l-2 transition-colors",
        isSelected
          ? "bg-primary/10 border-l-primary"
          : "border-l-transparent hover:bg-muted/45",
        !message.isRead && !isSelected && "bg-background",
      )}
      data-slot="mail-message-row"
    >
      <button
        type="button"
        className="min-w-0 py-2 pl-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={handleSelect}
        aria-label={`Message from ${senderLabel}: ${message.subject}`}
        aria-current={isSelected ? "true" : undefined}
      >
        <div className="flex min-w-0 items-center gap-1.5">
            {!message.isRead ? (
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                aria-hidden
              />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0" aria-hidden />
            )}
            <TruncatedText
              text={senderLabel}
              className={cn(
                "min-w-0 text-label",
                !message.isRead
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/80",
              )}
            />
            {priority ? <span className="sr-only">Needs attention</span> : null}
        </div>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-1 pl-3">
          <TruncatedText
            text={message.subject || "(no subject)"}
            className={cn(
              "min-w-0 shrink-0 max-w-[55%] text-xs",
              !message.isRead
                ? "font-semibold text-foreground"
                : "text-foreground/70",
            )}
          />
          {message.snippet ? (
            <span className="shrink-0 text-xs text-muted-foreground" aria-hidden>
              —
            </span>
          ) : null}
          <TruncatedText
            text={message.snippet}
            className="min-w-0 flex-1 text-xs text-muted-foreground"
          />
          {message.hasAttachments && (
            <Paperclip
              className="h-3 w-3 text-muted-foreground shrink-0"
              aria-hidden
            />
          )}
        </div>
      </button>
      <div
        className="relative flex w-[6.75rem] shrink-0 items-center justify-end pr-2"
        data-slot="mail-action-rail"
      >
        <span
          className={cn(
            "absolute right-9 top-2 whitespace-nowrap text-dense tabular-nums text-muted-foreground transition-opacity group-hover:opacity-0 group-focus-within:opacity-0",
            !message.isRead && "font-medium text-foreground/70",
          )}
        >
          {formatMessageDate(message.date)}
        </span>
        <div className="pointer-events-none absolute right-8 flex items-center rounded-md bg-inherit opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <QuickActions
            messageId={message.id}
            accountId={message.accountId}
            threadId={message.threadId}
            folder={folder}
            canAi={canAi}
            onAction={onAction}
            onAiBrief={onAiBrief}
          />
        </div>
        <StarButton
          messageId={message.id}
          accountId={message.accountId}
          isStarred={message.isStarred}
          threadId={message.threadId}
          onAction={onAction}
        />
      </div>
    </div>
  );
}
