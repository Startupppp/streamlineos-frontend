"use client";

import { useState, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { CheckCheck } from "lucide-react";
import {
  useInfiniteNotifications,
  useUnreadNotificationCount,
} from "@/hooks/api/notifications";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationDetailDrawer } from "@/features/notifications/notification-detail-drawer";
import { NotificationFilterBar } from "@/features/notifications/notification-filter-bar";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { NotificationVirtualList } from "@/features/notifications/notification-virtual-list";
import { ErrorState } from "@/components/shared/error-state";
import { useNotificationInbox } from "@/features/notifications/use-notification-inbox";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
import type {
  NotificationSection,
  NotificationCategory,
  NotificationPriority,
} from "@/features/notifications/notification-types";

export function NotificationsInboxPage() {
  const [activeSection, setActiveSection] = useState<NotificationSection>("ALL");
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | undefined>(undefined);
  const [activePriority, setActivePriority] = useState<NotificationPriority | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch("");
  }, []);

  const handleSectionChange = useCallback((section: NotificationSection) => {
    setActiveSection(section);
    setSelectedIds(new Set());
  }, []);

  const handleCategoryChange = useCallback((category: NotificationCategory | undefined) => {
    setActiveCategory(category);
  }, []);

  const handlePriorityChange = useCallback((priority: NotificationPriority | undefined) => {
    setActivePriority(priority);
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveCategory(undefined);
    setActivePriority(undefined);
  }, []);

  const {
    data: pages,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotifications({
    section: activeSection,
    category: activeCategory,
    priority: activePriority,
    search: debouncedSearch || undefined,
    limit: 30,
  });

  const notifications = pages?.pages.flat();
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;
  const items = useMemo(() => notifications ?? [], [notifications]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const detailNotif = useMemo(
    () => (detailId !== null ? items.find((n) => n.id === detailId) ?? null : null),
    [detailId, items],
  );

  const isOnline = useOnlineStatus();

  const { handlers, mutations, emptyTitle, emptyDescription } = useNotificationInbox({
    setSelectedIds,
    setDetailId,
    selectedIds,
    items,
    activeSection,
    debouncedSearch,
  });

  const {
    handleNotificationClick,
    handleDrawerOpenChange,
    handleOpenLink,
    handleMarkReadOne,
    handleUnarchive,
    handleSnooze,
    handleMarkAllRead,
    handleSelect,
    handleSelectAll,
    handleDeselectAll,
    handleArchive,
    handlePin,
    handleDelete,
    handleBulkMarkRead,
    handleBulkArchive,
    handleBulkDelete,
    handleApprove,
    handleReject,
  } = handlers;

  const { markAllRead, archive, pin, unpin, deleteMutation, bulkMarkRead, bulkArchive, bulkDelete, approve, reject } = mutations;

  const showMarkAllRead = activeSection === "ALL" || activeSection === "UNREAD";
  const isApprovalSection = activeSection === "APPROVALS";

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your organization"
      actions={
        showMarkAllRead ? (
          <LoadingButton
            size="sm"
            disabled={unreadCount === 0}
            isPending={markAllRead.isPending}
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
            {unreadCount > 0 && (
              <Badge
                variant="outline"
                className="ml-2 border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </LoadingButton>
        ) : undefined
      }
      filters={
        <NotificationFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          activePriority={activePriority}
          onPriorityChange={handlePriorityChange}
          onClearFilters={handleClearFilters}
          unreadCount={unreadCount}
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-2">
        <span className="sr-only" role="status" aria-live="polite">
          {!isOnline ? "You are offline. Notifications may be stale." : ""}
        </span>
        {!isOnline && (
          <div className="shrink-0 px-4 py-1.5 bg-status-warning-surface border border-status-warning-rule rounded-lg flex items-center gap-2 text-xs text-status-warning-ink font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning-fill animate-pulse shrink-0" aria-hidden="true" />
            You&apos;re offline — notifications may be stale
          </div>
        )}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 border rounded-lg bg-muted/40 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">
              {selectedIds.size} selected
            </span>
            <div className="h-3.5 w-px bg-border" />
            <LoadingButton
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={handleBulkMarkRead}
              isPending={bulkMarkRead.isPending}
            >
              Mark read
            </LoadingButton>
            <LoadingButton
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={handleBulkArchive}
              isPending={bulkArchive.isPending}
            >
              Archive
            </LoadingButton>
            <LoadingButton
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2 text-destructive hover:text-destructive"
              onClick={handleBulkDelete}
              isPending={bulkDelete.isPending}
            >
              Delete
            </LoadingButton>
            <div className="h-3.5 w-px bg-border" />
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleSelectAll}>
              Select all
            </Button>
            <AnimatedIconButton
              icon={XIcon}
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6"
              aria-label="Deselect all"
              onClick={handleDeselectAll}
            />
          </div>
        )}

        {isLoading ? (
          <NotificationListSkeleton />
        ) : isError ? (
          <ErrorState
            title="Failed to load notifications"
            description="We couldn't load your notifications. Please try again."
            onRetry={handleRetry}
          />
        ) : items.length === 0 ? (
          <EmptyState
            illustrationPreset="mail"
            title={emptyTitle}
            description={emptyDescription}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden">
            <NotificationVirtualList
              items={items}
              selectedIds={selectedIds}
              isApprovalSection={isApprovalSection}
              approvingId={approve.isPending ? approve.variables : undefined}
              rejectingId={reject.isPending ? reject.variables : undefined}
              archivingId={archive.isPending ? archive.variables : undefined}
              pinningId={pin.isPending ? pin.variables : unpin.isPending ? unpin.variables : undefined}
              deletingId={deleteMutation.isPending ? deleteMutation.variables : undefined}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onSelect={handleSelect}
              onClick={handleNotificationClick}
              onArchive={handleArchive}
              onPin={handlePin}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
              onLoadMore={handleLoadMore}
            />
          </div>
        )}

      </div>

      <NotificationDetailDrawer
        notification={detailNotif}
        open={detailNotif !== null}
        onOpenChange={handleDrawerOpenChange}
        onOpenLink={handleOpenLink}
        onMarkRead={handleMarkReadOne}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onPin={handlePin}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
      />
    </PageWrapper>
  );
}
