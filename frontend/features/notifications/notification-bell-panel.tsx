"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { CheckCheckIcon } from "@animateicons/react/lucide";
import { DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import {
  useUnreadNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORY_CONFIG,
  type NotificationCategory,
} from "@/lib/notification-types";
import { formatRelativeTime } from "./format-relative-time";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Notification } from "@/types/notifications";

function PanelSkeleton() {
  return (
    <div className="space-y-0.5 px-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-2.5 px-2 py-2">
          <Skeleton className="h-7 w-7 rounded-md shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-full max-w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  onItemClick,
}: {
  notification: Notification;
  onItemClick: (n: Notification) => void;
}) {
  const catKey = notification.category;
  const config =
    NOTIFICATION_CATEGORY_CONFIG[catKey] ?? NOTIFICATION_CATEGORY_CONFIG.SYSTEM;
  const Icon = config.icon;

  function handleClick() {
    onItemClick(notification);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50 rounded-md",
        !notification.isRead && "bg-primary/5",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5",
          config.bg,
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <TruncatedText
            text={notification.title}
            className={cn(
              "min-w-0 flex-1 text-label leading-snug",
              notification.isRead
                ? "font-medium text-muted-foreground"
                : "font-semibold text-foreground",
            )}
          />
          <span className="shrink-0 text-dense text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        {notification.message && (
          <TruncatedText
            text={notification.message}
            className="text-xs text-muted-foreground mt-0.5"
          />
        )}
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}

export interface NotificationBellPanelProps {
  unreadCount: number;
  surface: "popover" | "drawer";
  onClose: () => void;
}

export function NotificationBellPanel({
  unreadCount,
  surface,
  onClose,
}: NotificationBellPanelProps) {
  const router = useRouter();
  const {
    data: notifications,
    isLoading,
    isError,
  } = useUnreadNotifications({ enabled: true });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { iconRef: markAllReadIconRef, hoverHandlers: markAllReadHoverHandlers } =
    useAnimatedIcon();

  const recentNotifications = notifications?.slice(0, 6) ?? [];

  const handleItemClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) markRead.mutate(notification.id);
      if (notification.link) {
        onClose();
        router.push(notification.link);
      }
    },
    [onClose, markRead, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined);
  }, [markAllRead]);

  const title =
    surface === "drawer" ? (
      <DrawerTitle className="text-sm font-semibold text-foreground">
        Notifications
      </DrawerTitle>
    ) : (
      <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
    );

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        {title}
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={markAllRead.isPending}
              aria-label="Mark all notifications read"
              onClick={handleMarkAllRead}
              {...markAllReadHoverHandlers}
            >
              <CheckCheckIcon ref={markAllReadIconRef} size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {isLoading ? (
          <PanelSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Inbox className="mb-2 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t load notifications
            </p>
            <Link
              href="/notifications"
              onClick={onClose}
              className="mt-0.5 text-xs text-accent hover:underline"
            >
              Open the notification center
            </Link>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Inbox className="mb-2 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              You&apos;re all caught up
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No unread notifications
            </p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onItemClick={handleItemClick}
            />
          ))
        )}
      </div>

      <div className="border-t border-border px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          See all notifications →
        </Link>
      </div>
    </>
  );
}
