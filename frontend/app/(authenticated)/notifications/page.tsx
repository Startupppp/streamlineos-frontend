"use client";

import { useState, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { keepPreviousData } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import { NotificationCard } from "@/features/notifications/notification-card";
import { NotificationDetailDrawer } from "@/features/notifications/notification-detail-drawer";
import { NotificationFilterBar } from "@/features/notifications/notification-filter-bar";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useNotificationInbox } from "@/features/notifications/use-notification-inbox";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
import type {
  NotificationSection,
  NotificationCategory,
  NotificationPriority,
} from "@/features/notifications/notification-types";
import type { Notification } from "@/types/notifications";

export default function NotificationsPage() {
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
    placeholderData: keepPreviousData,
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

  const { handlers, mutations, emptyTitle, emptyDescription, rowVariants } = useNotificationInbox({
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
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            <AnimatePresence initial={false}>
              {items.map((n: Notification, idx: number) => (
                <motion.div
                  key={n.id}
                  {...rowVariants}
                  transition={
                    Object.keys(rowVariants).length === 0
                      ? undefined
                      : { duration: 0.2, delay: Math.min(idx, 10) * 0.04, ease: "easeOut" }
                  }
                >
                  <NotificationCard
                    id={n.id}
                    title={n.title}
                    message={n.message}
                    type={n.type}
                    priority={n.priority ?? "NORMAL"}
                    category={n.category ?? "SYSTEM"}
                    sourceModule={n.sourceModule ?? null}
                    isRead={n.isRead}
                    pinned={n.pinned ?? false}
                    archivedAt={n.archivedAt ?? null}
                    createdAt={n.createdAt}
                    link={n.link}
                    selected={selectedIds.has(n.id)}
                    isApproval={isApprovalSection}
                    isApproving={approve.isPending && approve.variables === n.id}
                    isRejecting={reject.isPending && reject.variables === n.id}
                    isArchiving={archive.isPending && archive.variables === n.id}
                    isPinning={
                      (pin.isPending && pin.variables === n.id) ||
                      (unpin.isPending && unpin.variables === n.id)
                    }
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === n.id}
                    onSelect={handleSelect}
                    onClick={handleNotificationClick}
                    onArchive={handleArchive}
                    onPin={handlePin}
                    onDelete={handleDelete}
                    onApprove={isApprovalSection ? handleApprove : undefined}
                    onReject={isApprovalSection ? handleReject : undefined}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {hasNextPage ? (
          <div className="flex justify-center pt-2">
            <LoadingButton
              variant="outline"
              size="sm"
              isPending={isFetchingNextPage}
              onClick={handleLoadMore}
            >
              Load older notifications
            </LoadingButton>
          </div>
        ) : null}
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
