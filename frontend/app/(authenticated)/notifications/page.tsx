"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, X } from "lucide-react";
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
} from "@/hooks/api/notifications";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationCard } from "@/features/notifications/notification-card";
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
  const [activeSection, setActiveSection] = useState<NotificationSection>("ALL");
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | undefined>(undefined);
  const [activePriority, setActivePriority] = useState<NotificationPriority | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  const { data: notifications, isLoading, isError, refetch } = useNotifications({
    section: activeSection,
    category: activeCategory,
    priority: activePriority,
    search: debouncedSearch || undefined,
    limit: 50,
  });
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

  const unreadCount = unreadData?.count ?? 0;
  const items = useMemo(() => notifications ?? [], [notifications]);

  const handleNotificationClick = useCallback(
    (notification: { id: number; isRead: boolean; link: string | null }) => {
      if (!notification.isRead) markRead.mutate(notification.id);
      if (notification.link) router.push(notification.link);
    },
    [markRead, router],
  );

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

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      mobileFiltersInline
      actions={
        showMarkAllRead ? (
          <Button
            size="sm"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={handleMarkAllRead}
          >
            {markAllRead.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Mark all read
            {unreadCount > 0 && (
              <Badge
                variant="outline"
                className="ml-2 border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
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
      <div className="space-y-2">
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 border rounded-lg bg-muted/40 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">
              {selectedIds.size} selected
            </span>
            <div className="h-3.5 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={handleBulkMarkRead}
              disabled={bulkMarkRead.isPending}
            >
              Mark read
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={handleBulkArchive}
              disabled={bulkArchive.isPending}
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2 text-destructive hover:text-destructive"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              Delete
            </Button>
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
            className="border-0 bg-transparent shadow-none py-16"
            compact
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {items.map((n: Notification) => (
              <NotificationCard
                key={n.id}
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
                onSelect={handleSelect}
                onClick={handleNotificationClick}
                onArchive={handleArchive}
                onPin={handlePin}
                onDelete={handleDelete}
                onApprove={isApprovalSection ? handleApprove : undefined}
                onReject={isApprovalSection ? handleReject : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
