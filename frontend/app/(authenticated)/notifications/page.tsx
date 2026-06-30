"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Filter, X, Inbox } from "lucide-react";
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
} from "@/hooks/api/notifications";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotificationCard } from "@/features/notifications/notification-card";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  SECTION_TABS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG,
  type NotificationSection,
  type NotificationCategory,
  type NotificationPriority,
} from "@/features/notifications/notification-types";
import type { Notification } from "@/types/notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<NotificationSection>("ALL");
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | undefined>(undefined);
  const [activePriority, setActivePriority] = useState<NotificationPriority | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const { data: notifications, isLoading, isError, refetch } = useNotifications({
    section: activeSection,
    category: activeCategory,
    priority: activePriority,
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

  const unreadCount = unreadData?.count ?? 0;
  const items = useMemo(() => notifications ?? [], [notifications]);
  const hasFilters = !!activeCategory || !!activePriority;

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

  const handleSectionChange = useCallback((value: string) => {
    setActiveSection(value as NotificationSection);
    setSelectedIds(new Set());
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setActiveCategory(value === "ALL" ? undefined : (value as NotificationCategory));
  }, []);

  const handlePriorityChange = useCallback((value: string) => {
    setActivePriority(value === "ALL" ? undefined : (value as NotificationPriority));
  }, []);

  const handleToggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    if (isPinned) {
      unpin.mutate(id);
    } else {
      pin.mutate(id);
    }
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

  const showMarkAllRead = activeSection === "ALL" || activeSection === "UNREAD";

  const emptyTitle = useMemo(() => {
    if (activeSection === "UNREAD") return "You're all caught up";
    if (activeSection === "ARCHIVED") return "No archived notifications";
    if (activeSection === "PINNED") return "No pinned notifications";
    return "No notifications yet";
  }, [activeSection]);

  const emptyDescription = useMemo(() => {
    if (activeSection === "UNREAD") return "All notifications have been read.";
    if (activeSection === "ARCHIVED") return "Notifications you archive will appear here.";
    if (activeSection === "PINNED") return "Pin important notifications to keep them visible.";
    return "When something important happens, you'll see it here.";
  }, [activeSection]);

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFilters}
            className={showFilters ? "border-blue-400 text-blue-600" : undefined}
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filters
            {hasFilters && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white">
                {(activeCategory ? 1 : 0) + (activePriority ? 1 : 0)}
              </span>
            )}
          </Button>
          {showMarkAllRead && (
            <Button
              variant="outline"
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
                <Badge variant="secondary" className="ml-2 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      }
      filters={
        <div className="space-y-0">
          <Tabs value={activeSection} onValueChange={handleSectionChange}>
            <TabsList className="bg-card border border-border">
              {SECTION_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {tab.value === "UNREAD" && unreadCount > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {showFilters && (
            <div className="flex items-center gap-2 pt-3 flex-wrap">
              <Select value={activeCategory ?? "ALL"} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {NOTIFICATION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {NOTIFICATION_CATEGORY_CONFIG[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={activePriority ?? "ALL"} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  {NOTIFICATION_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {NOTIFICATION_PRIORITY_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={handleClearFilters}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">{emptyDescription}</p>
          </div>
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
                onSelect={handleSelect}
                onClick={handleNotificationClick}
                onArchive={handleArchive}
                onPin={handlePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
