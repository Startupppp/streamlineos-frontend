"use client";

import { useCallback, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PageState } from "@/components/shared/page-state";
import { toast } from "sonner";
import { groupMailMessages } from "./mail-group-messages";
import { MailVirtualList } from "./mail-virtual-list";
import { MailListRowsSkeleton } from "./mail-shell-skeletons";
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
    isFetched,
    isFetching,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMailMessages(
    {
      folder: activeFolder,
      accountId: selectedAccountId,
      accountIds: accounts.map((account) => account.id),
      q: debouncedSearch || undefined,
    },
    { enabled: accounts.length > 0 },
  );

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const visibleMessages = useMemo(() => {
    const seen = new Set<string>();
    const loadedMessages = pages
      .flatMap((page) => page.messages)
      .filter((message) => {
        const key = `${message.accountId}:${message.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return loadedMessages.filter((message) =>
      view === "unread"
        ? !message.isRead
        : view === "attachments"
          ? message.hasAttachments
          : true,
    );
  }, [pages, view]);
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
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleViewChange = useCallback((value: string) => {
    setView(value);
  }, []);

  const handleNextPage = useCallback(async () => {
    if (!hasNextPage || !isOnline || isFetchingNextPage) return;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isOnline]);

  const initialLoading =
    isLoading || isFetched === false || (isFetching && pages.length === 0);
  const listPageState = isError && isOnline
    ? { kind: "error" as const, error }
    : isError && !isOnline
      ? { kind: "ready" as const }
    : initialLoading
      ? { kind: "loading" as const }
      : visibleMessages.length === 0 && !hasNextPage
        ? { kind: "empty" as const }
        : { kind: "ready" as const };

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
        <div
          data-slot="mail-toolbar"
          className="flex flex-row flex-nowrap items-center gap-2 overflow-x-hidden px-2 py-1.5"
        >
          <SearchInput
            value={search}
            onValueChange={handleSearchChange}
            onClear={() => handleSearchChange("")}
            placeholder="Search mail…"
            aria-label="Search mail"
            className="min-w-0 flex-1 focus-visible:ring-1 focus-visible:ring-offset-0"
          />
          <div className="w-36 min-w-28 shrink-0 sm:w-40">
            <Select value={view} onValueChange={handleViewChange}>
              <SelectTrigger
                aria-label="Filter loaded mail"
                className="h-9 w-full text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAIL_VIEW_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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

      <PageState
        resolution={listPageState}
        loading={<MailListRowsSkeleton />}
        empty={
          <div className="flex h-full min-h-0 flex-col items-center justify-center px-4 py-10 text-center">
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
        }
      >
      {isError && !isOnline ? (
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
      ) : (
        <div className="flex-1 min-h-0 max-md:pb-14">
          <MailVirtualList
            groups={groups}
            selectedMessageId={selectedMessageId}
            activeFolder={activeFolder}
            canAi={canAi}
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            onSelect={onSelectMessage}
            onAction={handleAction}
            onAiBrief={handleAiBrief}
            onLoadMore={handleNextPage}
          />
        </div>
      )}
      </PageState>
      <MailThreadBriefSheet
        open={threadBriefOpen}
        onOpenChange={setThreadBriefOpen}
        state={threadBriefState}
      />
    </div>
  );
}
