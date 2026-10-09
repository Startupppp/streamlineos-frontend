"use client";

import { useCallback, useMemo } from "react";
import { format, isThisYear, isToday, parseISO } from "date-fns";
import { Paperclip } from "lucide-react";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScrollArea,
  SCROLL_AREA_PAGE_BODY_CLASS,
} from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { resolvePageState } from "@/lib/page-state/resolve-page-state";
import { useMailMessages } from "@/hooks/api/mail";
import { groupMailMessages } from "./mail-group-messages";
import type { MailMessageSummary } from "@/types/mail";

interface MailEmptyPaneProps {
  variant: "select" | "connect" | "not_found" | "needs_reauth";
  selectedAccountId?: number | "all";
  onConnect?: () => void;
  onReconnect?: () => void;
  onSelectMessage?: (message: MailMessageSummary) => void;
  className?: string;
}

function senderLabel(message: MailMessageSummary): string {
  const name = message.from.name?.trim();
  if (name) return name;
  return message.from.email;
}

interface MessagePreviewRowProps {
  message: MailMessageSummary;
  onSelect: (message: MailMessageSummary) => void;
}

function formatPreviewDate(dateValue: string): string {
  const date = parseISO(dateValue);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

function MessagePreviewRow({
  message,
  onSelect,
}: MessagePreviewRowProps) {
  const handleClick = useCallback(() => {
    onSelect(message);
  }, [message, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group grid min-h-12 w-full grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 px-4 py-2 text-left transition-colors last:border-b-0",
        "hover:bg-muted/50 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        !message.isRead && "bg-muted/25",
      )}
      aria-label={`Open message from ${senderLabel(message)}: ${message.subject || "No subject"}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            message.isRead ? "bg-transparent" : "bg-primary",
          )}
        />
        <span className={cn("truncate text-xs", !message.isRead && "font-semibold")}>
          {senderLabel(message)}
        </span>
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-xs text-muted-foreground",
          !message.isRead && "font-medium text-foreground",
        )}
      >
        {message.subject || "(no subject)"}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-micro tabular-nums text-muted-foreground">
        {message.hasAttachments ? (
          <Paperclip className="size-3" aria-label="Has attachments" />
        ) : null}
        <span>{formatPreviewDate(message.date)}</span>
      </span>
    </button>
  );
}

function CalmPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      compact
      className="flex-1 border-0 bg-transparent"
      title={title}
      description={description}
    />
  );
}

function SelectEmptySurface({
  selectedAccountId,
  onSelectMessage,
  className,
}: {
  selectedAccountId: number | "all";
  onSelectMessage?: (message: MailMessageSummary) => void;
  className?: string;
}) {
  const { data, isLoading, isError, error, refetch } = useMailMessages({
    folder: "inbox",
    accountId: selectedAccountId,
  });

  const allMessages = useMemo(
    () => data?.pages.flatMap((p) => p.messages) ?? [],
    [data],
  );
  const groups = useMemo(
    () => groupMailMessages(allMessages),
    [allMessages],
  );
  const needsYou = groups.find((g) => g.key === "needs_you");
  const today = groups.find((g) => g.key === "today");
  const previewNeeds = (needsYou?.messages ?? []).slice(0, 3);
  const previewToday = (today?.messages ?? []).slice(0, 3);
  const hasPreviews = previewNeeds.length > 0 || previewToday.length > 0;
  const unreadCount = allMessages.filter((m) => !m.isRead).length;
  const handleSelectPreview = useCallback(
    (message: MailMessageSummary) => onSelectMessage?.(message),
    [onSelectMessage],
  );
  const pageState = resolvePageState({
    isLoading,
    isError,
    error,
    isEmpty: !hasPreviews || !onSelectMessage,
  });

  const loading = (
    <div className="px-5 py-5 sm:px-6" aria-label="Loading recent messages">
      <Skeleton className="mb-3 h-3 w-24 rounded" />
      <div className="divide-y divide-border/50 border-y border-border/50">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="grid min-h-12 grid-cols-[8rem_1fr_3rem] items-center gap-3 px-4 py-2"
          >
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const empty = (
    <CalmPlaceholder
      title={allMessages.length === 0 ? "Inbox is clear" : "Select a message"}
      description={
        allMessages.length === 0
          ? "New mail will appear here when it arrives."
          : "Choose a thread from the list to read and reply."
      }
    />
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <PageState
        resolution={pageState}
        loading={loading}
        empty={empty}
        onRetry={() => void refetch()}
        compact
        className="min-h-0 flex-1"
      >
        <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-foreground">
            Select a message
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread in this view`
              : "Your inbox is up to date"}
          </p>
        </div>

        <ScrollArea fill className={SCROLL_AREA_PAGE_BODY_CLASS}>
          <div className="flex min-h-full px-5 py-4 sm:px-6">
            <div className="flex min-h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card/20">
              {previewNeeds.length > 0 ? (
                <section aria-labelledby="needs-you-heading">
                  <div className="flex h-8 items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4">
                    <h3
                      id="needs-you-heading"
                      className="text-micro font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Needs you
                    </h3>
                    <span className="text-micro tabular-nums text-muted-foreground">
                      {previewNeeds.length}
                    </span>
                  </div>
                  <div className="flex-1">
                    {previewNeeds.map((message) => (
                      <MessagePreviewRow
                        key={`${message.accountId}-${message.id}`}
                        message={message}
                        onSelect={handleSelectPreview}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {previewToday.length > 0 ? (
                <section
                  aria-labelledby="recent-mail-heading"
                  className={cn(
                    previewNeeds.length > 0 && "border-t border-border",
                  )}
                >
                  <div className="flex h-8 items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4">
                    <h3
                      id="recent-mail-heading"
                      className="text-micro font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Recent mail
                    </h3>
                    <span className="text-micro tabular-nums text-muted-foreground">
                      {previewToday.length}
                    </span>
                  </div>
                  <div>
                    {previewToday.map((message) => (
                      <MessagePreviewRow
                        key={`${message.accountId}-${message.id}`}
                        message={message}
                        onSelect={handleSelectPreview}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </ScrollArea>
      </PageState>
    </div>
  );
}

export function MailEmptyPane({
  variant,
  selectedAccountId = "all",
  onConnect,
  onReconnect,
  onSelectMessage,
  className,
}: MailEmptyPaneProps) {
  if (variant === "not_found") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 items-center justify-center p-6",
          className,
        )}
      >
        <EmptyState
          compact
          className="flex-1 border-0 bg-transparent"
          title="Message not found"
          description="This message may have been moved, deleted, or does not belong to a connected account."
        />
      </div>
    );
  }

  if (variant === "needs_reauth") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 items-center justify-center p-6",
          className,
        )}
      >
        <EmptyState
          compact
          className="flex-1 border-0 bg-transparent"
          title="Reconnect your inbox"
          description="This account needs to be reconnected before messages can load."
          action={
            onReconnect ? { label: "Reconnect", onClick: onReconnect } : undefined
          }
        />
      </div>
    );
  }

  if (variant === "connect") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 items-center justify-center p-6",
          className,
        )}
      >
        <EmptyState
          compact
          illustrationSize="sm"
          illustration={<EmptyMailIllustration className="h-24 w-24" />}
          className="w-full max-w-xl border-0 bg-transparent px-4 py-8"
          title="Your inbox. One focused workspace."
          description="Bring Gmail and Outlook together. Read across accounts, reply in context, and turn your inbox into a brief with clear next steps."
          action={
            onConnect
              ? { label: "Directly Connect", onClick: onConnect }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <SelectEmptySurface
      selectedAccountId={selectedAccountId}
      onSelectMessage={onSelectMessage}
      className={className}
    />
  );
}
