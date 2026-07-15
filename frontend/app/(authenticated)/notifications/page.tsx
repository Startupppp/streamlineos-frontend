"use client";

import { useState, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { CheckCheck, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useArchiveNotification,
  usePinNotification,
  useUnpinNotification,
  useDeleteNotification,
  useBulkMarkRead,
  useBulkArchive,
  useBulkDelete,
  useApproveNotification,
  useRejectNotification,
  useSnoozeNotification,
  useUnarchiveNotification,
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
import type {
  NotificationSection,
  NotificationCategory,
  NotificationPriority,
} from "@/features/notifications/notification-types";
import type { Notification } from "@/types/notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
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

  const { data: notifications, isLoading, isError, refetch } = useNotifications(
    {
      section: activeSection,
      category: activeCategory,
      priority: activePriority,
      search: debouncedSearch || undefined,
      limit: 50,
    },
    { placeholderData: keepPreviousData },
  );
  const { data: unreadData } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archive = useArchiveNotification();
  const pin = usePinNotification();
  const unpin = useUnpinNotification();
  const deleteMutation = useDeleteNotification();
  const bulkMarkRead = useBulkMarkRead();
  const bulkArchive = useBulkArchive();
  const bulkDelete = useBulkDelete();
  const approve = useApproveNotification();
  const reject = useRejectNotification();
  const snooze = useSnoozeNotification();
  const unarchive = useUnarchiveNotification();

  const unreadCount = unreadData?.count ?? 0;
  const items = useMemo(() => notifications ?? [], [notifications]);
  const detailNotif = useMemo(
    () => (detailId !== null ? items.find((n) => n.id === detailId) ?? null : null),
    [detailId, items],
  );

  const handleNotificationClick = useCallback(
    (notification: { id: number; isRead: boolean; link: string | null }) => {
      setDetailId(notification.id);
      if (!notification.isRead) markRead.mutate(notification.id);
    },
    [markRead],
  );

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) setDetailId(null);
  }, []);

  const handleOpenLink = useCallback((link: string) => {
    router.push(link);
  }, [router]);

  const handleMarkReadOne = useCallback((id: number) => {
    markRead.mutate(id);
  }, [markRead]);

  const handleUnarchive = useCallback((id: number) => {
    unarchive.mutate(id);
  }, [unarchive]);

  const handleSnooze = useCallback((id: number, snoozedUntil: string) => {
    snooze.mutate({ id, snoozedUntil });
  }, [snooze]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined);
  }, [markAllRead]);

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

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((n) => n.id)));
  }, [items]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleArchive = useCallback((id: number) => {
    archive.mutate(id);
  }, [archive]);

  const handlePin = useCallback((id: number, isPinned: boolean) => {
    if (isPinned) unpin.mutate(id);
    else pin.mutate(id);
  }, [pin, unpin]);

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [deleteMutation]);

  const handleBulkMarkRead = useCallback(() => {
    bulkMarkRead.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [bulkMarkRead, selectedIds]);

  const handleBulkArchive = useCallback(() => {
    bulkArchive.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [bulkArchive, selectedIds]);

  const handleBulkDelete = useCallback(() => {
    bulkDelete.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [bulkDelete, selectedIds]);

  const handleApprove = useCallback((id: number) => {
    approve.mutate(id);
  }, [approve]);

  const handleReject = useCallback((id: number) => {
    reject.mutate(id);
  }, [reject]);

  const showMarkAllRead = activeSection === "ALL" || activeSection === "UNREAD";
  const isApprovalSection = activeSection === "APPROVALS";

  const emptyTitle = useMemo(() => {
    if (debouncedSearch) return "No matching notifications";
    if (activeSection === "UNREAD") return "You're all caught up";
    if (activeSection === "ARCHIVED") return "No archived notifications";
    if (activeSection === "APPROVALS") return "No pending approvals";
    if (activeSection === "MENTIONS") return "No mentions yet";
    if (activeSection === "ASSIGNED_TO_ME") return "Nothing assigned to you";
    if (activeSection === "BROADCASTS") return "No broadcasts";
    if (activeSection === "SYSTEM") return "No system notifications";
    return "No notifications yet";
  }, [activeSection, debouncedSearch]);

  const emptyDescription = useMemo(() => {
    if (debouncedSearch) return "Try different search terms or clear the search.";
    if (activeSection === "UNREAD") return "All notifications have been read.";
    if (activeSection === "ARCHIVED") return "Notifications you archive will appear here.";
    if (activeSection === "APPROVALS") return "Approval requests will appear here when they need your attention.";
    if (activeSection === "MENTIONS") return "You'll see notifications when someone mentions you.";
    if (activeSection === "ASSIGNED_TO_ME") return "Tasks and items assigned to you will appear here.";
    if (activeSection === "BROADCASTS") return "Organization-wide announcements will appear here.";
    return "When something important happens, you'll see it here.";
  }, [activeSection, debouncedSearch]);

  const rowVariants = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
      };

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      mobileFiltersInline
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
      <div className="flex flex-1 min-h-0 flex-col space-y-2">
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
            <button type="button" onClick={handleDeselectAll} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
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
                    prefersReducedMotion
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
