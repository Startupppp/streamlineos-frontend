"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import {
  BellIcon,
  BellRingIcon,
  CheckCheckIcon,
} from "@animateicons/react/lucide";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import {
  useUnreadNotificationCount,
  useUnreadNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORY_CONFIG,
  type NotificationCategory,
} from "./notification-types";
import { formatRelativeTime } from "./format-relative-time";
import { useNotificationEvents } from "./use-notification-events";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Notification } from "@/types/notifications";

const HOVER_CLOSE_DELAY_MS = 175;

function BellBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-micro font-bold leading-none text-primary-foreground">
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
          <span className="shrink-0 text-dense text-muted-foreground/50">
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

function PopoverSkeleton() {
  return (
    <div className="space-y-0.5 px-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-2.5 px-2 py-2">
          <Skeleton className="h-7 w-7 rounded-md shrink-0" />{" "}
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-full max-w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface NotificationPanelProps {
  surface: "popover" | "drawer";
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  recentNotifications: Notification[];
  isMarkingAllRead: boolean;
  onItemClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  markAllReadHoverHandlers: ReturnType<typeof useAnimatedIcon>["hoverHandlers"];
  markAllReadIconRef: ReturnType<typeof useAnimatedIcon>["iconRef"];
}

function NotificationPanel({
  surface,
  unreadCount,
  isLoading,
  isError,
  recentNotifications,
  isMarkingAllRead,
  onItemClick,
  onMarkAllRead,
  onClose,
  markAllReadHoverHandlers,
  markAllReadIconRef,
}: NotificationPanelProps) {
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
              disabled={isMarkingAllRead}
              aria-label="Mark all notifications read"
              onClick={onMarkAllRead}
              {...markAllReadHoverHandlers}
            >
              <CheckCheckIcon ref={markAllReadIconRef} size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {isLoading ? (
          <PopoverSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Inbox className="mb-2 w-8 text-muted-foreground/30" />
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
            <Inbox className="mb-2 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              You&apos;re all caught up
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No unread notifications
            </p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <PopoverNotificationItem
              key={notification.id}
              notification={notification}
              onItemClick={onItemClick}
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

export function NotificationBell() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enableHoverOpen = !isMobile;

  const {
    iconRef: bellIconRef,
    hoverHandlers: bellHoverHandlers,
  } = useAnimatedIcon();
  const markAllReadAnimated = useAnimatedIcon();

  useNotificationEvents();
  const { data: unreadData } = useUnreadNotificationCount();
  const {
    data: notifications,
    isLoading,
    isError,
  } = useUnreadNotifications({ enabled: open });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.count ?? 0;
  const recentNotifications = notifications?.slice(0, 6) ?? [];

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
        handleOpenChange(false);
        router.push(notification.link);
      }
    },
    [handleOpenChange, markRead, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined);
  }, [markAllRead]);

  const handleClose = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const notificationPanel = (
    <NotificationPanel
      surface={isMobile ? "drawer" : "popover"}
      unreadCount={unreadCount}
      isLoading={isLoading}
      isError={isError}
      recentNotifications={recentNotifications}
      isMarkingAllRead={markAllRead.isPending}
      onItemClick={handleItemClick}
      onMarkAllRead={handleMarkAllRead}
      onClose={handleClose}
      markAllReadHoverHandlers={markAllReadAnimated.hoverHandlers}
      markAllReadIconRef={markAllReadAnimated.iconRef}
    />
  );

  const trigger = (
    <button
      type="button"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      onMouseEnter={
        enableHoverOpen
          ? handleHoverEnter
          : bellHoverHandlers.onMouseEnter
      }
      onMouseLeave={
        enableHoverOpen
          ? handleHoverLeave
          : bellHoverHandlers.onMouseLeave
      }
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      {unreadCount > 0 ? (
        <BellRingIcon ref={bellIconRef} size={16} />
      ) : (
        <BellIcon ref={bellIconRef} size={16} />
      )}
      <BellBadge count={unreadCount} />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="flex h-[min(80dvh,32rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
          {notificationPanel}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex max-h-[420px] w-80 flex-col p-0 shadow-lg sm:w-[360px]"
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        {notificationPanel}
      </PopoverContent>
    </Popover>
  );
}
