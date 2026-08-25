"use client";

import { useCallback, useState, forwardRef } from "react";
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
      <div className="flex items-center gap-0.5">
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
  const [isHovered, setIsHovered] = useState(false);
  const handleSelect = useCallback(
    () => onSelect(message),
    [message, onSelect],
  );
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  const senderLabel = message.from.name ?? message.from.email;
  const priority = showPriority && scoreNeedsYou(message) >= 5;

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-3 py-2 border-b border-border/25 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected
          ? "bg-primary/10 border-l-2 border-l-primary"
          : "hover:bg-muted/40 border-l-2 border-l-transparent",
        !message.isRead && !isSelected && "bg-primary/5",
      )}
      onClick={handleSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Message from ${senderLabel}: ${message.subject}`}
      aria-current={isSelected ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
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
              "text-label min-w-0",
              !message.isRead
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80",
            )}
          />
          {priority && (
            <span className="shrink-0 rounded px-1 py-px text-micro font-semibold uppercase tracking-wide bg-status-warning-surface text-status-warning-ink border border-status-warning-rule">
              Act
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isHovered ? (
            <QuickActions
              messageId={message.id}
              accountId={message.accountId}
              threadId={message.threadId}
              folder={folder}
              canAi={canAi}
              onAction={onAction}
              onAiBrief={onAiBrief}
            />
          ) : (
            <span
              className={cn(
                "text-dense text-muted-foreground tabular-nums",
                !message.isRead && "font-medium text-foreground/70",
              )}
            >
              {formatMessageDate(message.date)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-0.5 min-w-0 pl-3">
        <TruncatedText
          text={message.subject || "(no subject)"}
          className={cn(
            "text-xs flex-1 min-w-0",
            !message.isRead
              ? "font-semibold text-foreground"
              : "text-foreground/70",
          )}
        />
        {message.hasAttachments && (
          <Paperclip
            className="h-3 w-3 text-muted-foreground shrink-0"
            aria-hidden
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-1 mt-0.5 pl-3">
        <TruncatedText
          text={message.snippet}
          className="text-dense text-muted-foreground flex-1 min-w-0"
        />
        <StarButton
          messageId={message.id}
          accountId={message.accountId}
          isStarred={message.isStarred}
          threadId={message.threadId}
          onAction={onAction}
        />
      </div>
    </button>
  );
}
