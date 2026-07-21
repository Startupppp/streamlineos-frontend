"use client";

import { useCallback, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  ScrollArea,
  SCROLL_AREA_PAGE_BODY_CLASS,
} from "@/components/ui/scroll-area";
import { Inbox, Send, Archive, Trash2, Star, AlertCircle } from "lucide-react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useMailMessages,
  useMailAction,
  useMailThreadSummary,
} from "@/hooks/api/mail";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { groupMailMessages } from "./mail-group-messages";
import { MailMessageRow, type MailListAction } from "./mail-message-row";
import type { MailFolder, MailMessageSummary, MailAccount } from "@/types/mail";

const FOLDER_NAV: {
  key: MailFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "starred", label: "Starred", icon: Star },
  { key: "sent", label: "Sent", icon: Send },
  { key: "archive", label: "Archive", icon: Archive },
  { key: "trash", label: "Trash", icon: Trash2 },
];

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
  const threadSummary = useMailThreadSummary();
  const canAi = useCan("mail:ai:use");

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

  const allMessages = useMemo(
    () => data?.pages.flatMap((p) => p.messages) ?? [],
    [data],
  );
  const accountErrors = data?.pages[0]?.accountErrors ?? [];
  const groups = useMemo(
    () =>
      activeFolder === "inbox" && !debouncedSearch
        ? groupMailMessages(allMessages)
        : [{ key: "earlier" as const, label: "", messages: allMessages }],
    [allMessages, activeFolder, debouncedSearch],
  );

  const handleAction = useCallback(
    (
      messageId: string,
      accountId: number,
      action: MailListAction,
      threadId?: string,
    ) => {
      mailAction.mutate(
        {
          messageId,
          body: {
            accountId,
            action,
            ...(threadId !== undefined && { threadId }),
          },
        },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [mailAction],
  );

  const handleAiBrief = useCallback(
    (accountId: number, threadId: string) => {
      toast.promise(
        threadSummary.mutateAsync({ accountId, threadId }).then((data) => {
          const items = data.actionItems.length
            ? `\n\nActions:\n${data.actionItems.map((i) => `• ${i}`).join("\n")}`
            : "";
          return `${data.summary}${items}`;
        }),
        {
          loading: "Briefing thread…",
          success: (text) => ({
            message: "Thread brief",
            description:
              text.length > 280 ? `${text.slice(0, 280)}…` : text,
          }),
          error: (err) => getErrorMessage(err),
        },
      );
    },
    [threadSummary],
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
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-4 py-8 text-center">
        <p className="text-[13px] font-medium text-foreground/80">
          No accounts yet
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Connect from the reading pane or settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-2.5 pb-2 border-b border-border/40 shrink-0 space-y-2">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          onClear={handleSearchClear}
          placeholder="Search — from:, subject, or plain words…"
          className="h-9"
        />
        <nav
          className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5 -mx-0.5 px-0.5"
          aria-label="Mail folders"
        >
          {FOLDER_NAV.map((folder) => {
            const Icon = folder.icon;
            const active = activeFolder === folder.key;
            return (
              <button
                key={folder.key}
                type="button"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                onClick={() => handleFolderClick(folder.key)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-3 w-3 shrink-0" aria-hidden />
                {folder.label}
              </button>
            );
          })}
        </nav>
      </div>

      {accountErrors.length > 0 && (
        <div className="flex flex-col gap-1 px-3 py-2 border-b border-border/20 shrink-0">
          {accountErrors.map((ae) => (
            <div
              key={ae.accountId}
              className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5"
            >
              <AlertCircle
                className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5"
                aria-hidden
              />
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

      <ScrollArea fill className={SCROLL_AREA_PAGE_BODY_CLASS}>
        {isLoading ? (
          <div>
            {[...Array(8)].map((_, i) => (
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
            <p className="text-sm text-muted-foreground">
              {getErrorMessage(error)}
            </p>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-10 text-center">
            <p className="text-[13px] font-medium text-foreground/80">
              {debouncedSearch
                ? "No messages found"
                : `No messages in ${activeFolder}`}
            </p>
            {debouncedSearch ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Try from:, a name, or fewer words.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.key}>
                {group.label ? (
                  <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 px-3 py-1.5 bg-background/90 backdrop-blur-sm border-b border-border/30">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {group.messages.length}
                    </span>
                  </div>
                ) : null}
                {group.messages.map((message) => (
                  <MailMessageRow
                    key={`${message.accountId}-${message.id}`}
                    message={message}
                    isSelected={selectedMessageId === message.id}
                    folder={activeFolder}
                    showPriority={activeFolder === "inbox"}
                    canAi={canAi}
                    onSelect={onSelectMessage}
                    onAction={handleAction}
                    onAiBrief={handleAiBrief}
                  />
                ))}
              </div>
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
      </ScrollArea>
    </div>
  );
}
