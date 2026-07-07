"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck, Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";
import {
  useUnreadNotificationCount,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORY_CONFIG,
  type NotificationCategory,
} from "./notification-types";
import { formatRelativeTime } from "./format-relative-time";
import { useNotificationEvents } from "./use-notification-events";
import type { Notification } from "@/types/notifications";

const HOVER_CLOSE_DELAY_MS = 175;

function BellBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold leading-none text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function PopoverNotificationItem({
  notification,
  onItemClick,
}: {
  notification: Notification;
  onItemClick: (n: Notification) => void;
}) {
  const catKey = (notification.category ?? "SYSTEM") as NotificationCategory;
  const config = NOTIFICATION_CATEGORY_CONFIG[catKey] ?? NOTIFICATION_CATEGORY_CONFIG.SYSTEM;
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
        !notification.isRead && "bg-blue-50/40",
      )}
    >
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5", config.bg)}>
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-[13px] truncate leading-snug", notification.isRead ? "font-medium text-muted-foreground" : "font-semibold text-foreground")}>
            {notification.title}
          </p>
          <span className="text-[11px] text-muted-foreground/50 shrink-0">{formatRelativeTime(notification.createdAt)}</span>
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{notification.message}</p>
        )}
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

function PopoverSkeleton() {
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

export function NotificationBell() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enableHoverOpen = !isMobile;

  useNotificationEvents();
  const { data: unreadData } = useUnreadNotificationCount();
  const { data: notifications, isLoading } = useNotifications({ section: "ALL", limit: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.count ?? 0;
  const recentNotifications = notifications?.slice(0, 5) ?? [];

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleHoverEnter = useCallback(() => {
    if (!enableHoverOpen) return;
    clearCloseTimeout();
    handleOpenChange(true);
  }, [enableHoverOpen, clearCloseTimeout, handleOpenChange]);

  const handleHoverLeave = useCallback(() => {
    if (!enableHoverOpen) return;
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      handleOpenChange(false);
      closeTimeoutRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }, [enableHoverOpen, clearCloseTimeout, handleOpenChange]);

  useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

  const handleItemClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markRead.mutate(notification.id);
      }
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [markRead, router],
  );

  function handleMarkAllRead() {
    markAllRead.mutate(undefined);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          onMouseEnter={enableHoverOpen ? handleHoverEnter : undefined}
          onMouseLeave={enableHoverOpen ? handleHoverLeave : undefined}
          className="relative h-8 w-8 rounded-lg flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          <BellBadge count={unreadCount} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-[360px] p-0 shadow-lg"
        onMouseEnter={enableHoverOpen ? handleHoverEnter : undefined}
        onMouseLeave={enableHoverOpen ? handleHoverLeave : undefined}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={markAllRead.isPending}
                onClick={handleMarkAllRead}
                title="Mark all read"
              >
                <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
            <Link
              href="/notifications"
              className="text-xs text-foreground/80 hover:text-foreground font-medium px-2 py-1 rounded-md hover:bg-muted transition-colors"
            >
              View all
            </Link>
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto py-1 px-1">
          {isLoading ? (
            <PopoverSkeleton />
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground mt-0.5">No new notifications</p>
            </div>
          ) : (
            recentNotifications.map((notification) => (
              <PopoverNotificationItem
                key={notification.id}
                notification={notification}
                onItemClick={handleItemClick}
              />
            ))
          )}
        </div>

        <div className="border-t border-border px-3 py-2">
          <Link
            href="/notifications"
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            See all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
