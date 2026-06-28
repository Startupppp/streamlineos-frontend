"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/api/hooks/notifications";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { NotificationCard } from "@/features/notifications/notification-card";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import type { NotificationTabFilter } from "@/features/notifications/notification-types";

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTabFilter>("ALL");

  const isUnreadOnly = activeTab === "UNREAD";
  const { data: notifications, isLoading, isError, refetch } = useNotifications(
    isUnreadOnly,
    50,
  );
  const { data: unreadData } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.count ?? 0;

  const filtered = useMemo(
    () =>
      (notifications ?? []).filter((n) => {
        if (activeTab === "ALL" || activeTab === "UNREAD") return true;
        return n.type === activeTab;
      }),
    [notifications, activeTab],
  );

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

  const handleTabChange = useCallback(
    (v: string) => setActiveTab(v as NotificationTabFilter),
    [],
  );

  function handleRetry() { void refetch(); }

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={
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
          Mark all as read
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      }
      filters={
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
        >
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="UNREAD">
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="INFO">Info</TabsTrigger>
            <TabsTrigger value="SUCCESS">Success</TabsTrigger>
            <TabsTrigger value="WARNING">Warning</TabsTrigger>
            <TabsTrigger value="ERROR">Error</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {isLoading ? (
        <NotificationListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Failed to load notifications"
          description="We couldn't load your notifications. Please try again."
          onRetry={refetch}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration={<EmptyInboxIllustration className="h-32 w-32" />}
          title={
            activeTab === "UNREAD"
              ? "You're all caught up"
              : "No notifications yet"
          }
          description={
            activeTab === "UNREAD"
              ? "All your notifications have been read. Check back later for new updates."
              : "When something important happens, you'll see it here."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationCard
              key={n.id}
              id={n.id}
              title={n.title}
              message={n.message}
              type={n.type}
              isRead={n.isRead}
              createdAt={n.createdAt}
              link={n.link}
              onClick={handleNotificationClick}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
