"use client";

import * as React from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheckIcon } from "@animateicons/react/lucide";
import {
  useInfiniteNotifications,
  useMarkAllNotificationsRead,
} from "@/hooks/api/notifications-inbox";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import type {
  Notification,
  NotificationSection,
  NotificationCategory,
} from "@/types/notifications";
import { InboxNotificationItem } from "./inbox-notification-item";
import { InboxFilterBar } from "./inbox-filter-bar";
import { InboxBulkToolbar } from "./inbox-bulk-toolbar";
import { InboxListSkeleton } from "./inbox-list-skeleton";
import { useInboxKeyboardNav } from "./use-inbox-keyboard-nav";
import { useInboxBulkActions } from "./use-inbox-bulk-actions";
import {
  INBOX_FETCH_PAGE_SIZE,
  INBOX_RENDER_PAGE_SIZE,
  INBOX_MOBILE_RENDER_PAGE_SIZE,
  resolveInboxVisibleCount,
} from "./inbox-render-window";
import { useIsBelowLg } from "@/hooks/common/use-mobile";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import {
  BUILD_INBOX_TRIAGE_TABS,
  getBuildInboxTriageSection,
} from "./inbox-categories";

interface InboxListProps {
  selectedId: number | null;
  section: NotificationSection;
  q: string | null;
  type?: NotificationCategory | null;
  projectId?: number | null;
  cursor?: number | null;
  selectionDismissed?: boolean;
  onSelect: (notification: Notification) => void;
  onClearSelection?: () => void;
  onSectionChange?: (section: NotificationSection) => void;
  onQChange?: (q: string) => void;
  onTypeChange?: (value: NotificationCategory | null) => void;
  onProjectClear?: () => void;
  onFilterChange?: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  renderActions?: (notification: Notification) => React.ReactNode;
}

export function InboxList({
  selectedId,
  section,
  q,
  type = null,
  projectId = null,
  cursor = null,
  selectionDismissed = false,
  onSelect,
  onClearSelection,
  onSectionChange,
  onQChange,
  onTypeChange,
  onProjectClear,
  onFilterChange,
  searchInputRef,
  hasActiveFilters = false,
  onClearFilters,
  renderActions,
}: InboxListProps) {
  const isDesktopInbox = !useIsBelowLg();
  const renderPageSize = isDesktopInbox
    ? INBOX_RENDER_PAGE_SIZE
    : INBOX_MOBILE_RENDER_PAGE_SIZE;
  const isOnline = useOnlineStatus();
  const bulk = useInboxBulkActions();
  const [shortcutHelpOpen, setShortcutHelpOpen] = React.useState(false);
  function handleShortcutHelp() {
    setShortcutHelpOpen(true);
  }

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteNotifications({
    section,
    sourceModule: "build",
    search: q ?? undefined,
    category: type ?? undefined,
    projectId: projectId ?? undefined,
    limit: INBOX_FETCH_PAGE_SIZE,
    initialCursor: cursor,
  });

  const [pagesShown, setPagesShown] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const { mutate: markAllRead, isPending: isMarkingAll } =
    useMarkAllNotificationsRead("build");

  const rawNotifications = React.useMemo(
    () => data?.pages.flat() ?? [],
    [data],
  );
  const total = rawNotifications.length;

  React.useEffect(() => {
    setPagesShown(1);
    setSelectedIds(new Set());
  }, [section, q, type, projectId, cursor]);

  const pageState = usePageState({
    permission: "build:view",
    isLoading: isPending,
    isError,
    error,
    isEmpty: !isPending && total === 0 && !hasNextPage && isOnline,
  });

  const visibleCount = resolveInboxVisibleCount(
    total,
    pagesShown,
    renderPageSize,
  );
  const heldCount = total - visibleCount;
  const visibleNotifications = React.useMemo(
    () => rawNotifications.slice(0, visibleCount),
    [rawNotifications, visibleCount],
  );
  const deferredVisibleNotifications =
    React.useDeferredValue(visibleNotifications);

  function handleSelect(notification: Notification) {
    onSelect(notification);
  }
  function handleTabChange(value: string) {
    const next = BUILD_INBOX_TRIAGE_TABS.find(
      (filter) => filter.value === value,
    )?.value;
    if (next !== undefined) onSectionChange?.(next);
  }
  function handleMarkAll() {
    markAllRead(undefined, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }
  function handleRetry() {
    void refetch();
  }
  function handleLoadMore() {
    setPagesShown((p) => p + 1);
    if (heldCount === 0) fetchNextPage();
  }
  function handleToggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function handleSelectAll() {
    setSelectedIds(new Set(deferredVisibleNotifications.map((n) => n.id)));
  }
  function handleDeselectAll() {
    setSelectedIds(new Set());
  }
  function handleBulkMarkRead() {
    bulk.runBulkMarkRead([...selectedIds]);
    setSelectedIds(new Set());
  }
  function handleBulkArchive() {
    bulk.runBulkArchive([...selectedIds]);
    setSelectedIds(new Set());
  }
  function handleBulkDelete() {
    bulk.runBulkDelete([...selectedIds]);
    setSelectedIds(new Set());
  }
  function handleQChange(raw: string) {
    onQChange?.(raw);
  }
  function handleTypeChange(value: NotificationCategory | null) {
    onTypeChange?.(value);
    onFilterChange?.();
  }
  function handleClearFilters() {
    onClearFilters?.();
  }

  const hasUnread = rawNotifications.some((n) => !n.isRead);
  const firstNotification = rawNotifications[0] ?? null;
  const onSelectRef = React.useRef(onSelect);
  const firstNotificationRef = React.useRef(firstNotification);
  React.useLayoutEffect(() => {
    onSelectRef.current = onSelect;
    firstNotificationRef.current = firstNotification;
  });

  React.useEffect(() => {
    if (isPending || isError) return;
    if (!isDesktopInbox) return;
    if (selectedId != null || selectionDismissed) return;
    const first = firstNotificationRef.current;
    if (first) onSelectRef.current(first);
  }, [
    isPending,
    isError,
    isDesktopInbox,
    selectedId,
    selectionDismissed,
    firstNotification?.id,
  ]);

  React.useEffect(() => {
    if (section !== "SNOOZED" || !isOnline) return;
    const now = Date.now();
    const deadlines = rawNotifications
      .map((row) =>
        row.snoozedUntil ? new Date(row.snoozedUntil).getTime() : 0,
      )
      .filter((deadline) => deadline > now);
    const nearest = Math.min(...deadlines);
    if (!Number.isFinite(nearest)) return;
    const timer = setTimeout(
      () => {
        void refetch();
      },
      Math.min(nearest - now + 1, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [section, isOnline, rawNotifications, refetch]);

  useInboxKeyboardNav({
    notifications: deferredVisibleNotifications,
    selectedId,
    onSelect: handleSelect,
    onClearSelection: () => onClearSelection?.(),
    searchInputRef,
    onShortcutHelp: handleShortcutHelp,
  });

  const emptyTitle =
    section === "SNOOZED"
      ? "Nothing for later"
      : section === "ARCHIVED"
        ? "Nothing done yet"
        : section === "UNREAD"
          ? "All caught up"
          : section === "MENTIONS"
            ? "No mentions"
            : "No notifications";
  const emptyDesc =
    section === "SNOOZED"
      ? "Snoozed notifications appear here until their deadline."
      : section === "ARCHIVED"
        ? "Resolved notifications appear here."
        : section === "UNREAD"
          ? "You have no unread notifications."
          : section === "MENTIONS"
            ? "You have not been mentioned in any comments yet."
            : "Notifications will appear here when you receive them.";
  function renderNotification(notification: Notification, index: number) {
    return (
      <div
        key={notification.id}
        role="listitem"
        aria-posinset={index + 1}
        aria-setsize={hasNextPage ? -1 : total}
      >
        <InboxNotificationItem
          notification={notification}
          isSelected={selectedId === notification.id}
          isSelectable
          isChecked={selectedIds.has(notification.id)}
          onSelect={handleSelect}
          onToggleSelect={handleToggleSelect}
          actions={renderActions?.(notification)}
        />
      </div>
    );
  }

  return (
    <>
      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
      />
      <Tabs
        value={getBuildInboxTriageSection(section)}
        onValueChange={handleTabChange}
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 py-1.5">
          <TabsList className="h-8 min-h-8 border-0 bg-muted/60 p-0.5 [&_[data-slot=tabs-trigger]]:h-7 [&_[data-slot=tabs-trigger]]:min-h-7 [&_[data-slot=tabs-trigger]]:px-3">
            {BUILD_INBOX_TRIAGE_TABS.map(({ label, value }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-foreground data-[state=active]:text-background"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {hasUnread && isOnline ? (
            <AnimatedIconButton
              icon={CheckCheckIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              disabled={isMarkingAll}
              onClick={handleMarkAll}
              aria-label="Mark all read"
              title="Mark all read"
            />
          ) : null}
        </div>
        <InboxFilterBar
          section={section}
          onSectionChange={onSectionChange}
          q={q}
          type={type}
          projectId={projectId}
          hasActiveFilters={hasActiveFilters}
          onQChange={handleQChange}
          onTypeChange={handleTypeChange}
          onProjectClear={onProjectClear}
          onClearFilters={handleClearFilters}
          searchInputRef={searchInputRef}
        />
        <InboxBulkToolbar
          selectedIds={selectedIds}
          totalVisible={deferredVisibleNotifications.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkMarkRead={handleBulkMarkRead}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
          isMutating={bulk.isMutating || !isOnline}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide">
          <PageState
            resolution={pageState}
            loading={
              <div className="flex min-h-full flex-col">
                <InboxListSkeleton />
              </div>
            }
            onRetry={handleRetry}
            compact
            className="min-h-full w-full flex-1"
            empty={
              hasNextPage || !isOnline ? (
                <div />
              ) : (
                <EmptyState
                  illustration={<EmptyInboxIllustration />}
                  title={emptyTitle}
                  description={emptyDesc}
                  filtersActive={hasActiveFilters}
                  filteredTitle="No matching notifications"
                  onClearFilters={hasActiveFilters ? onClearFilters : undefined}
                  className="min-h-full w-full flex-1"
                />
              )
            }
          >
            <div>
              <div role="list" aria-label="Notifications">
                {deferredVisibleNotifications.map(renderNotification)}
              </div>
              <InfiniteScrollSentinel
                hasNextPage={heldCount > 0 || hasNextPage === true}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={handleLoadMore}
                label="Load older notifications"
                pending="Loading…"
              />
            </div>
          </PageState>
        </div>
      </Tabs>
    </>
  );
}
