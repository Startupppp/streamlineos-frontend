"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheckIcon } from "@animateicons/react/lucide";
import {
  useInfiniteNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/notifications";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Notification, NotificationSection } from "@/types/notifications";
import { InboxNotificationItem } from "./inbox-notification-item";
import {
  INBOX_FETCH_PAGE_SIZE,
  INBOX_RENDER_PAGE_SIZE,
  INBOX_MOBILE_RENDER_PAGE_SIZE,
  resolveInboxVisibleCount,
} from "./inbox-render-window";
import { useShellVariant } from "@/components/layout/shell-variant-context";

type InboxTab = NotificationSection | "MENTIONS";

const SECTION_FILTERS: { label: string; value: InboxTab }[] = [
  { label: "Unread", value: "UNREAD" },
  { label: "All", value: "ALL" },
  { label: "Mentions", value: "MENTIONS" },
];

function isInboxTab(value: string): value is InboxTab {
  return value === "UNREAD" || value === "ALL" || value === "MENTIONS";
}

interface InboxListProps {
  selectedId: number | null;
  selectionDismissed?: boolean;
  onSelect: (notification: Notification) => void;
  onClearSelection?: () => void;
  onFilterChange?: () => void;
}

function isMentionNotification(n: Notification): boolean {
  return typeof n.eventKey === "string" && n.eventKey.includes("mention");
}

function InboxListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-border px-4 py-3">
          <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="mt-1.5 h-3 w-4/5 rounded" />
            <div className="mt-1.5 flex items-center gap-2">
              <Skeleton className="h-4 w-14 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
              <Skeleton className="ml-auto h-3 w-12 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxList({
  selectedId,
  selectionDismissed = false,
  onSelect,
  onClearSelection,
  onFilterChange,
}: InboxListProps) {
  const isDesktopInbox = useShellVariant() === "desktop";
  const renderPageSize = isDesktopInbox ? INBOX_RENDER_PAGE_SIZE : INBOX_MOBILE_RENDER_PAGE_SIZE;
  const [activeTab, setActiveTab] = React.useState<InboxTab>("UNREAD");

  const querySection: NotificationSection = activeTab === "MENTIONS" ? "ALL" : activeTab;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteNotifications({
    section: querySection,
    category: activeTab === "MENTIONS" ? "PROJECTS" : undefined,
    sourceModule: "build",
    limit: INBOX_FETCH_PAGE_SIZE,
  });

  const [pagesShown, setPagesShown] = React.useState(1);

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();

  function handleSelect(notification: Notification) {
    if (!notification.isRead) {
      markRead(notification.id);
    }
    onSelect(notification);
  }

  function handleTabChange(value: string) {
    if (isInboxTab(value)) {
      setActiveTab(value);
      setPagesShown(1);
      onFilterChange?.();
    }
  }

  function handleMarkAll() {
    markAllRead();
  }

  function handleRetry() {
    refetch();
  }

  const rawNotifications = React.useMemo(() => data?.pages.flat() ?? [], [data]);
  const notifications = React.useMemo(
    () => (activeTab === "MENTIONS" ? rawNotifications.filter(isMentionNotification) : rawNotifications),
    [activeTab, rawNotifications],
  );
  const total = notifications.length;
  const visibleCount = resolveInboxVisibleCount(total, pagesShown, renderPageSize);
  const heldCount = total - visibleCount;
  const visibleNotifications = React.useMemo(
    () => notifications.slice(0, visibleCount),
    [notifications, visibleCount],
  );
  const deferredVisibleNotifications = React.useDeferredValue(visibleNotifications);

  function handleLoadMore() {
    setPagesShown((p) => p + 1);
    if (heldCount === 0) fetchNextPage();
  }
  const hasUnread = notifications.some((n) => !n.isRead);
  const firstNotification = notifications[0] ?? null;
  const selectedStillVisible =
    selectedId == null || notifications.some((n) => n.id === selectedId);

  const onSelectRef = React.useRef(onSelect);
  const onClearSelectionRef = React.useRef(onClearSelection);
  const firstNotificationRef = React.useRef(firstNotification);
  onSelectRef.current = onSelect;
  onClearSelectionRef.current = onClearSelection;
  firstNotificationRef.current = firstNotification;

  React.useEffect(() => {
    if (isLoading || isError) return;
    if (selectedId != null && !selectedStillVisible) {
      onClearSelectionRef.current?.();
      return;
    }
    if (!isDesktopInbox) return;
    if (selectedId != null || selectionDismissed) return;
    const first = firstNotificationRef.current;
    if (first) onSelectRef.current(first);
  }, [
    isLoading,
    isError,
    isDesktopInbox,
    selectedId,
    selectedStillVisible,
    selectionDismissed,
    firstNotification?.id,
  ]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border border-r-0 border-border px-4 py-2">
        <TabsList>
          {SECTION_FILTERS.map(({ label, value }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {hasUnread ? (
          <AnimatedIconButton
            icon={CheckCheckIcon}
            iconSize={14}
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={isMarkingAll}
            onClick={handleMarkAll}
            aria-label="Mark all read"
            title="Mark all read"
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-l border-border scrollbar-hide">
        {isLoading && (
          <div className="flex min-h-full flex-col">
            <InboxListSkeleton />
          </div>
        )}

        {!isLoading && isError && (
          <ErrorState
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            compact
            className="min-h-full w-full flex-1 p-4"
          />
        )}

        {!isLoading && !isError && total === 0 && !hasNextPage && (
          <EmptyState
            illustrationPreset="mail"
            title={
              activeTab === "UNREAD"
                ? "All caught up"
                : activeTab === "MENTIONS"
                ? "No mentions"
                : "No notifications"
            }
            description={
              activeTab === "UNREAD"
                ? "You have no unread notifications."
                : activeTab === "MENTIONS"
                ? "You have not been mentioned in any comments yet."
                : "Notifications will appear here when you receive them."
            }
            compact
            className="min-h-full w-full flex-1 rounded-lg border-dashed p-4"
          />
        )}

        {!isLoading && !isError && (total > 0 || hasNextPage) && (
          <div>
            <div role="list" aria-label="Notifications">
              {deferredVisibleNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  role="listitem"
                  aria-posinset={index + 1}
                  aria-setsize={hasNextPage ? -1 : total}
                >
                  <InboxNotificationItem
                    notification={notification}
                    isSelected={selectedId === notification.id}
                    onSelect={handleSelect}
                  />
                </div>
              ))}
            </div>
            {heldCount > 0 || hasNextPage ? (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  className="text-dense text-primary hover:underline disabled:opacity-50"
                >
                  {heldCount > 0
                    ? `Show ${Math.min(heldCount, renderPageSize)} more (${visibleCount} of ${total})`
                    : isFetchingNextPage
                      ? "Loading…"
                      : "Load older notifications"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Tabs>
  );
}
