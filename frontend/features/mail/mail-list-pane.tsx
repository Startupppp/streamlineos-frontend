"use client";

import { useCallback, useRef, useState, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Inbox, Send, Archive, Trash2, Star, Paperclip, AlertCircle } from "lucide-react";
import { StarIcon, Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { format, isToday, isThisYear, parseISO } from "date-fns";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useMailMessages, useMailAction } from "@/hooks/api/mail";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { MailFolder, MailMessageSummary, MailAccount } from "@/types/mail";

const FOLDER_NAV: { key: MailFolder; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "starred", label: "Starred", icon: Star },
  { key: "sent", label: "Sent", icon: Send },
  { key: "archive", label: "Archive", icon: Archive },
  { key: "trash", label: "Trash", icon: Trash2 },
];

function formatMessageDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

interface StarButtonProps {
  messageId: string;
  accountId: number;
  isStarred: boolean;
  onAction: (messageId: string, accountId: number, action: "star" | "unstar", threadId?: string) => void;
  threadId?: string | null;
}

const StarButton = forwardRef<HTMLButtonElement, StarButtonProps>(
  function StarButton({ messageId, accountId, isStarred, onAction, threadId }, _ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction(messageId, accountId, isStarred ? "unstar" : "star", threadId ?? undefined);
      },
      [messageId, accountId, isStarred, onAction, threadId],
    );
    return (
      <button
        type="button"
        aria-label={isStarred ? "Unstar" : "Star"}
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isStarred ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
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
  onAction: (messageId: string, accountId: number, action: "archive" | "trash", threadId?: string) => void;
}

const QuickActions = forwardRef<HTMLDivElement, QuickActionsProps>(
  function QuickActions({ messageId, accountId, threadId, folder, onAction }, _ref) {
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

    if (folder === "archive" || folder === "trash") return null;

    return (
      <div className="flex items-center gap-0.5">
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

interface MessageRowProps {
  message: MailMessageSummary;
  isSelected: boolean;
  folder: MailFolder;
  onSelect: (message: MailMessageSummary) => void;
  onAction: (messageId: string, accountId: number, action: "star" | "unstar" | "archive" | "trash", threadId?: string) => void;
}

function MessageRow({ message, isSelected, folder, onSelect, onAction }: MessageRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = useCallback(() => onSelect(message), [message, onSelect]);
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const senderLabel = message.from.name ?? message.from.email;

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50",
        !message.isRead && !isSelected && "bg-primary/5",
      )}
      onClick={handleSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Message from ${senderLabel}: ${message.subject}`}
      aria-selected={isSelected}
    >
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {!message.isRead && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1" aria-hidden />
          )}
          <TruncatedText
            text={senderLabel}
            className={cn(
              "text-[13px] min-w-0",
              !message.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80",
            )}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isHovered ? (
            <QuickActions
              messageId={message.id}
              accountId={message.accountId}
              threadId={message.threadId}
              folder={folder}
              onAction={onAction}
            />
          ) : (
            <span className={cn("text-[11px] text-muted-foreground", !message.isRead && "font-medium text-foreground/70")}>
              {formatMessageDate(message.date)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
        <TruncatedText
          text={message.subject}
          className={cn(
            "text-[12px] flex-1 min-w-0",
            !message.isRead ? "font-semibold text-foreground" : "text-foreground/70",
          )}
        />
        {message.hasAttachments && (
          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
        )}
      </div>

      <div className="flex items-center justify-between gap-1 mt-0.5">
        <TruncatedText
          text={message.snippet}
          className="text-[11px] text-muted-foreground flex-1 min-w-0"
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

interface MailListPaneProps {
  selectedMessageId: string | null;
  selectedAccountId: number | "all";
  onSelectMessage: (message: MailMessageSummary) => void;
  onOpenAccountsSheet: () => void;
  accounts: MailAccount[];
}

export function MailListPane({
  selectedMessageId,
  selectedAccountId,
  onSelectMessage,
  onOpenAccountsSheet,
  accounts,
}: MailListPaneProps) {
  const [activeFolder, setActiveFolder] = useState<MailFolder>("inbox");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const mailAction = useMailAction();
  const listRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMailMessages({
    folder: activeFolder,
    accountId: selectedAccountId,
    q: debouncedSearch || undefined,
  });

  const allMessages = data?.pages.flatMap((p) => p.messages) ?? [];
  const accountErrors = data?.pages[0]?.accountErrors ?? [];

  const handleAction = useCallback(
    (messageId: string, accountId: number, action: "star" | "unstar" | "archive" | "trash", threadId?: string) => {
      mailAction.mutate(
        { messageId, body: { accountId, action, ...(threadId !== undefined && { threadId }) } },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [mailAction],
  );

  const handleFolderClick = useCallback((folder: MailFolder) => {
    setActiveFolder(folder);
    setSearch("");
  }, []);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleSearchClear = useCallback(() => setSearch(""), []);

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center p-4">
        <EmptyState
          illustrationPreset="mail"
          title="No mail accounts connected"
          description="Connect a Gmail or Outlook account to start managing your email."
          action={{ label: "Connect your email", onClick: onOpenAccountsSheet }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-border/40 shrink-0">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          onClear={handleSearchClear}
          placeholder="Search mail…"
          className="h-9"
        />
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-1.5 border-b border-border/20 shrink-0" aria-label="Mail folders">
        {FOLDER_NAV.map((folder) => {
          const Icon = folder.icon;
          return (
            <button
              key={folder.key}
              type="button"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                activeFolder === folder.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              onClick={() => handleFolderClick(folder.key)}
              aria-current={activeFolder === folder.key ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {folder.label}
            </button>
          );
        })}
      </nav>

      {accountErrors.length > 0 && (
        <div className="flex flex-col gap-1 px-3 py-2 border-b border-border/20 shrink-0">
          {accountErrors.map((ae) => (
            <div
              key={ae.accountId}
              className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5"
            >
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-destructive">
                  {ae.accountEmail ?? `Account ${ae.accountId}`}
                </p>
                <p className="text-[10px] text-destructive/80">{ae.message}</p>
                <button
                  type="button"
                  className="text-[10px] underline text-destructive mt-0.5 hover:no-underline focus-visible:outline-none"
                  onClick={onOpenAccountsSheet}
                >
                  Reconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div>
            {[...Array(7)].map((_, i) => (
              <div key={i} className="px-3 py-2.5 border-b border-border/20">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-3 w-10 rounded shrink-0" />
                </div>
                <Skeleton className="h-3.5 w-full rounded mb-1" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex-1 h-full flex items-center justify-center p-4">
            <EmptyState
              compact
              illustrationPreset="mail"
              illustrationSize="sm"
              title={debouncedSearch ? "No messages found" : `No messages in ${activeFolder}`}
              description={debouncedSearch ? "Try different search terms." : undefined}
            />
          </div>
        ) : (
          <>
            {allMessages.map((message) => (
              <MessageRow
                key={`${message.accountId}-${message.id}`}
                message={message}
                isSelected={selectedMessageId === message.id}
                folder={activeFolder}
                onSelect={onSelectMessage}
                onAction={handleAction}
              />
            ))}
            {hasNextPage && (
              <div className="flex justify-center py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  className="text-xs"
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
