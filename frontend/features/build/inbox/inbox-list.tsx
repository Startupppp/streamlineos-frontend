"use client";

import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheckIcon } from "@animateicons/react/lucide";
import {
  useInfiniteNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/notifications";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import type { Notification, NotificationSection, NotificationCategory } from "@/types/notifications";
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
import { useShellVariant } from "@/components/layout/shell-variant-context";

const SECTION_FILTERS: { label: string; value: NotificationSection }[] = [
  { label: "Unread", value: "UNREAD" },
  { label: "All", value: "ALL" },
  { label: "Mentions", value: "MENTIONS" },
];

interface InboxListProps {
  selectedId: number | null;
  section: NotificationSection;
  q: string | null;
  type?: NotificationCategory | null;
  selectionDismissed?: boolean;
  onSelect: (notification: Notification) => void;
  onClearSelection?: () => void;
  onSectionChange?: (section: NotificationSection) => void;
  onQChange?: (q: string) => void;
  onTypeChange?: (value: NotificationCategory | null) => void;
  onFilterChange?: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function InboxList({
  selectedId,
  section,
  q,
  type = null,
  selectionDismissed = false,
  onSelect,
  onClearSelection,
  onSectionChange,
  onQChange,
  onTypeChange,
  onFilterChange,
  searchInputRef,
  hasActiveFilters = false,
  onClearFilters,
}: InboxListProps) {
  const isDesktopInbox = useShellVariant() === "desktop";
  const renderPageSize = isDesktopInbox ? INBOX_RENDER_PAGE_SIZE : INBOX_MOBILE_RENDER_PAGE_SIZE;
  const isOnline = useOnlineStatus();
  const bulk = useInboxBulkActions();

  const { data, isPending, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteNotifications({ section, sourceModule: "build", search: q ?? undefined, category: type ?? undefined, limit: INBOX_FETCH_PAGE_SIZE });

  const [pagesShown, setPagesShown] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();

  const rawNotifications = React.useMemo(() => data?.pages.flat() ?? [], [data]);
  const total = rawNotifications.length;

  React.useEffect(() => { setPagesShown(1); setSelectedIds(new Set()); }, [section, q, type]);

  const pageState = usePageState({
    isLoading: isPending,
    isError,
    error,
    isEmpty: !isPending && total === 0 && !hasNextPage && isOnline,
  });

  const visibleCount = resolveInboxVisibleCount(total, pagesShown, renderPageSize);
  const heldCount = total - visibleCount;
  const visibleNotifications = React.useMemo(() => rawNotifications.slice(0, visibleCount), [rawNotifications, visibleCount]);
  const deferredVisibleNotifications = React.useDeferredValue(visibleNotifications);

  function handleSelect(notification: Notification) {
    if (!notification.isRead) markRead(notification.id);
    onSelect(notification);
  }
  function handleTabChange(value: string) {
    const next = value as NotificationSection;
    if (SECTION_FILTERS.some((f) => f.value === next)) { onSectionChange?.(next); onFilterChange?.(); }
  }
  function handleMarkAll() { markAllRead(); }
  function handleRetry() { void refetch(); }
  function handleLoadMore() { setPagesShown((p) => p + 1); if (heldCount === 0) fetchNextPage(); }
  function handleToggleSelect(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function handleSelectAll() { setSelectedIds(new Set(deferredVisibleNotifications.map((n) => n.id))); }
  function handleDeselectAll() { setSelectedIds(new Set()); }
  function handleBulkMarkRead() { bulk.runBulkMarkRead([...selectedIds]); setSelectedIds(new Set()); }
  function handleBulkArchive() { bulk.runBulkArchive([...selectedIds]); setSelectedIds(new Set()); }
  function handleBulkDelete() { bulk.runBulkDelete([...selectedIds]); setSelectedIds(new Set()); }
  function handleQChange(raw: string) { onQChange?.(raw); }
  function handleTypeChange(value: NotificationCategory | null) { onTypeChange?.(value); onFilterChange?.(); }
  function handleClearFilters() { onClearFilters?.(); }

  const hasUnread = rawNotifications.some((n) => !n.isRead);
  const firstNotification = rawNotifications[0] ?? null;
  const selectedStillVisible = selectedId == null || rawNotifications.some((n) => n.id === selectedId);

  const onSelectRef = React.useRef(onSelect);
  const onClearSelectionRef = React.useRef(onClearSelection);
  const firstNotificationRef = React.useRef(firstNotification);
  onSelectRef.current = onSelect;
  onClearSelectionRef.current = onClearSelection;
  firstNotificationRef.current = firstNotification;

  React.useEffect(() => {
    if (isPending || isError) return;
    if (selectedId != null && !selectedStillVisible) { onClearSelectionRef.current?.(); return; }
    if (!isDesktopInbox) return;
    if (selectedId != null || selectionDismissed) return;
    const first = firstNotificationRef.current;
    if (first) onSelectRef.current(first);
  }, [isPending, isError, isDesktopInbox, selectedId, selectedStillVisible, selectionDismissed, firstNotification?.id]);

  useInboxKeyboardNav({ notifications: deferredVisibleNotifications, selectedId, onSelect: handleSelect, onClearSelection: () => onClearSelection?.(), searchInputRef });

  const emptyTitle = section === "UNREAD" ? "All caught up" : section === "MENTIONS" ? "No mentions" : "No notifications";
  const emptyDesc = section === "UNREAD" ? "You have no unread notifications." : section === "MENTIONS" ? "You have not been mentioned in any comments yet." : "Notifications will appear here when you receive them.";

  return (
    <Tabs value={section} onValueChange={handleTabChange} className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex shrink-0 items-center justify-between gap-2 border border-r-0 border-border px-4 py-2">
        <TabsList>
          {SECTION_FILTERS.map(({ label, value }) => (
            <TabsTrigger key={value} value={value}>{label}</TabsTrigger>
          ))}
        </TabsList>
        {hasUnread ? (
          <AnimatedIconButton icon={CheckCheckIcon} iconSize={14} variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" disabled={isMarkingAll} onClick={handleMarkAll} aria-label="Mark all read" title="Mark all read" />
        ) : null}
      </div>
      <InboxFilterBar q={q} type={type} hasActiveFilters={hasActiveFilters} onQChange={handleQChange} onTypeChange={handleTypeChange} onClearFilters={handleClearFilters} searchInputRef={searchInputRef} />
      <InboxBulkToolbar selectedIds={selectedIds} totalVisible={deferredVisibleNotifications.length} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} onBulkMarkRead={handleBulkMarkRead} onBulkArchive={handleBulkArchive} onBulkDelete={handleBulkDelete} isMutating={bulk.isMutating} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-l border-border scrollbar-hide">
        <PageState resolution={pageState} loading={<div className="flex min-h-full flex-col"><InboxListSkeleton /></div>} onRetry={handleRetry} compact className="min-h-full w-full flex-1"
          empty={hasNextPage || !isOnline ? <div /> : (
            <EmptyState illustrationPreset="mail" title={emptyTitle} description={emptyDesc} filtersActive={hasActiveFilters} filteredTitle="No matching notifications" onClearFilters={hasActiveFilters ? onClearFilters : undefined} compact className="min-h-full w-full flex-1 rounded-lg border-dashed p-4" />
          )}
        >
          <div>
            <div role="list" aria-label="Notifications">
              {deferredVisibleNotifications.map((notification, index) => (
                <div key={notification.id} role="listitem" aria-posinset={index + 1} aria-setsize={hasNextPage ? -1 : total}>
                  <InboxNotificationItem notification={notification} isSelected={selectedId === notification.id} isSelectable isChecked={selectedIds.has(notification.id)} onSelect={handleSelect} onToggleSelect={handleToggleSelect} />
                </div>
              ))}
            </div>
            {heldCount > 0 || hasNextPage ? (
              <div className="flex justify-center py-3">
                <button type="button" onClick={handleLoadMore} disabled={isFetchingNextPage} className="text-dense text-primary hover:underline disabled:opacity-50">
                  {heldCount > 0 ? `Show ${Math.min(heldCount, renderPageSize)} more (${visibleCount} of ${total})` : isFetchingNextPage ? "Loading…" : "Load older notifications"}
                </button>
              </div>
            ) : null}
          </div>
        </PageState>
      </div>
    </Tabs>
  );
}
