"use client";

import { useCallback, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import {
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  AlertCircle,
  WifiOff,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  useMailMessages,
  useMailAction,
  useMailThreadSummary,
} from "@/hooks/api/mail";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { groupMailMessages } from "./mail-group-messages";
import { MailVirtualList } from "./mail-virtual-list";
import {
  MailThreadBriefSheet,
  type MailThreadBriefState,
} from "./mail-thread-brief-sheet";
import type { MailListAction } from "./mail-message-row";
import type {
  MailFolder,
  MailMessageSummary,
  MailAccount,
  MailListResponse,
} from "@/types/mail";

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

const MAIL_VIEW_OPTIONS = [
  { value: "all", label: "All messages" },
  { value: "unread", label: "Unread" },
  { value: "attachments", label: "With attachments" },
] as const;

function MailFolderButton({
  folder,
  active,
  onSelect,
}: {
  folder: (typeof FOLDER_NAV)[number];
  active: boolean;
  onSelect: (folder: MailFolder) => void;
}) {
  const Icon = folder.icon;
  const handleClick = useCallback(
    () => onSelect(folder.key),
    [onSelect, folder.key],
  );
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-dense font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
      onClick={handleClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {folder.label}
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
  const [view, setView] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [threadBriefOpen, setThreadBriefOpen] = useState(false);
  const [threadBriefState, setThreadBriefState] =
    useState<MailThreadBriefState>({ status: "loading" });
  const debouncedSearch = useDebouncedValue(search, 300);
  const mailAction = useMailAction();
  const threadSummary = useMailThreadSummary();
  const canAi = useCan("mail:ai:use");
  const isOnline = useOnlineStatus();

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMailMessages(
    {
      folder: activeFolder,
      accountId: selectedAccountId,
      q: debouncedSearch || undefined,
    },
    { enabled: accounts.length > 0 },
  );

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const currentPageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const visibleMessages = useMemo(() => {
    const pageMessages = pages[currentPageIndex]?.messages ?? [];
    return pageMessages.filter((message) =>
      view === "unread"
        ? !message.isRead
        : view === "attachments"
          ? message.hasAttachments
          : true,
    );
  }, [currentPageIndex, pages, view]);
  const accountErrors = useMemo(() => {
    const byAccount = new Map<
      number,
      MailListResponse["accountErrors"][number]
    >();
    for (const page of data?.pages ?? [])
      for (const failure of page.accountErrors)
        byAccount.set(failure.accountId, failure);
    return [...byAccount.values()];
  }, [data]);
  const groups = useMemo(
    () =>
      activeFolder === "inbox" && !debouncedSearch
        ? groupMailMessages(visibleMessages)
        : [{ key: "earlier" as const, label: "", messages: visibleMessages }],
    [visibleMessages, activeFolder, debouncedSearch],
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
    async (accountId: number, threadId: string) => {
      setThreadBriefState({ status: "loading" });
      setThreadBriefOpen(true);
      try {
        const result = await threadSummary.mutateAsync({ accountId, threadId });
        setThreadBriefState({
          status: "ready",
          summary: result.summary,
          actionItems: result.actionItems,
        });
      } catch (error) {
        setThreadBriefState({
          status: "error",
          message: getErrorMessage(error),
        });
      }
    },
    [threadSummary],
  );

  const handleFolderSelect = useCallback((folder: MailFolder) => {
    setActiveFolder(folder);
    setSearch("");
    setPageIndex(0);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPageIndex(0);
  }, []);

  const handleViewChange = useCallback((value: string) => {
    setView(value);
    setPageIndex(0);
  }, []);

  /**
   * Offline, the next page cannot arrive. Asking for it anyway spends the
   * scroll's one load-more trigger on a request that fails, and the failure is
   * indistinguishable from the end of the mailbox once the user reconnects.
   */
  const handlePreviousPage = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleNextPage = useCallback(async () => {
    if (currentPageIndex < pages.length - 1) {
      setPageIndex((current) => current + 1);
      return;
    }
    if (!hasNextPage || !isOnline || isFetchingNextPage) return;
    const result = await fetchNextPage();
    if ((result.data?.pages.length ?? 0) > pages.length) {
      setPageIndex((current) => current + 1);
    }
  }, [
    currentPageIndex,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isOnline,
    pages.length,
  ]);

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-4 py-8 text-center">
        <p className="text-label font-medium text-foreground/80">
          No accounts yet
        </p>
        <p className="mt-1 text-dense text-muted-foreground">
          Connect from the reading pane or settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-border/40">
        <BuildListToolbar
          className="flex-row flex-nowrap overflow-x-hidden border-b-0 px-2 py-1.5 [&>[data-slot=search-input]]:min-w-0 [&>[data-slot=search-input]]:basis-auto [&>[data-slot=search-input]]:md:max-w-none [&>[data-slot=build-toolbar-actions]]:shrink-0"
          search={{
            value: search,
            onValueChange: handleSearchChange,
            placeholder: "Search mail…",
            label: "Search mail",
            inputClassName: "focus-visible:ring-1 focus-visible:ring-offset-0",
          }}
          trailing={(
            <div className="w-36 min-w-28 sm:w-40">
              <BuildFilterSelect
                label="Filter loaded mail"
                value={view}
                onValueChange={handleViewChange}
                options={MAIL_VIEW_OPTIONS}
                className="w-full min-w-0 max-w-40"
              />
            </div>
          )}
        />
        <nav
          className="flex gap-1 overflow-x-auto px-2 pb-1.5 scrollbar-hide"
          aria-label="Mail folders"
        >
          {FOLDER_NAV.map((folder) => (
            <MailFolderButton
              key={folder.key}
              folder={folder}
              active={activeFolder === folder.key}
              onSelect={handleFolderSelect}
            />
          ))}
        </nav>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {!isOnline ? "You are offline. Mail may be stale." : ""}
      </span>

      {!isOnline && (
        <div className="mx-3 my-2 shrink-0 px-3 py-1.5 bg-status-warning-surface border border-status-warning-rule rounded-lg flex items-center gap-2 text-dense text-status-warning-ink font-medium">
          <span
            className="h-1.5 w-1.5 rounded-full bg-status-warning-fill animate-pulse shrink-0"
            aria-hidden="true"
          />
          You&apos;re offline — mail may be stale
        </div>
      )}

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
                <p className="text-dense font-medium text-destructive">
                  {ae.accountEmail ?? `Account ${ae.accountId}`}
                </p>
                <p className="text-micro text-destructive/80">{ae.message}</p>
                <button
                  type="button"
                  className="text-micro underline text-destructive mt-0.5 hover:no-underline focus-visible:outline-none"
                  onClick={onOpenAccountsSheet}
                >
                  Reconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
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
      ) : isError && !isOnline ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
          <WifiOff className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-label font-medium text-foreground/80">
            You&apos;re offline
          </p>
          <p className="text-dense text-muted-foreground">
            Mail will load again once you reconnect.
          </p>
        </div>
      ) : isError ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </p>
        </div>
      ) : visibleMessages.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-10 text-center">
          <p className="text-label font-medium text-foreground/80">
            {view !== "all"
              ? "No matching loaded messages"
              : debouncedSearch
                ? "No messages found"
                : `No messages in ${activeFolder}`}
          </p>
          {debouncedSearch ? (
            <p className="mt-1 text-dense text-muted-foreground">
              Try from:, a name, or fewer words.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex-1 min-h-0 max-md:pb-24">
          <MailVirtualList
            groups={groups}
            selectedMessageId={selectedMessageId}
            activeFolder={activeFolder}
            canAi={canAi}
            onSelect={onSelectMessage}
            onAction={handleAction}
            onAiBrief={handleAiBrief}
          />
        </div>
      )}
      {visibleMessages.length > 0 ? (
        <TablePagination
          className="sticky bottom-0 z-40 min-h-11 bg-background pb-[max(0.25rem,env(safe-area-inset-bottom))] max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom))]"
          mode="cursor"
          rowCount={visibleMessages.length}
          pageNumber={currentPageIndex + 1}
          hasPrevious={currentPageIndex > 0}
          hasMore={currentPageIndex < pages.length - 1 || Boolean(hasNextPage)}
          onPrevious={handlePreviousPage}
          onNext={() => {
            void handleNextPage();
          }}
          disabled={!isOnline || isFetchingNextPage}
          compact
        />
      ) : null}
      <MailThreadBriefSheet
        open={threadBriefOpen}
        onOpenChange={setThreadBriefOpen}
        state={threadBriefState}
      />
    </div>
  );
}
