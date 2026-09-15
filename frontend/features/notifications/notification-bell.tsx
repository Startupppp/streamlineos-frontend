"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  BellIcon,
  BellRingIcon,
} from "@animateicons/react/lucide";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useUnreadNotificationCount } from "@/hooks/api/notifications";

const HOVER_CLOSE_DELAY_MS = 175;

const NotificationBellPanel = dynamic(
  () =>
    import("./notification-bell-panel").then((m) => m.NotificationBellPanel),
  { ssr: false },
);

function BellBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-micro font-bold leading-none text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function PanelLoadingSkeleton() {
  return (
    <div className="space-y-0.5 px-1 py-1">
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enableHoverOpen = !isMobile;

  const { iconRef: bellIconRef, hoverHandlers: bellHoverHandlers } =
    useAnimatedIcon();

  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) setPanelMounted(true);
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

  const handleClose = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const trigger = (
    <button
      type="button"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      onMouseEnter={
        enableHoverOpen ? handleHoverEnter : bellHoverHandlers.onMouseEnter
      }
      onMouseLeave={
        enableHoverOpen ? handleHoverLeave : bellHoverHandlers.onMouseLeave
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

  const liveRegion = (
    <span className="sr-only" role="status" aria-live="polite">
      {unreadCount > 0 ? `${unreadCount} unread notifications` : ""}
    </span>
  );

  const panelContent = panelMounted ? (
    <NotificationBellPanel
      unreadCount={unreadCount}
      surface={isMobile ? "drawer" : "popover"}
      onClose={handleClose}
    />
  ) : (
    <PanelLoadingSkeleton />
  );

  if (isMobile) {
    return (
      <>
        {liveRegion}
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent className="flex h-[min(80dvh,32rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
            {panelContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {liveRegion}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="flex max-h-[420px] w-80 flex-col p-0 shadow-lg sm:w-[360px]"
          onMouseEnter={handleHoverEnter}
          onMouseLeave={handleHoverLeave}
        >
          {panelContent}
        </PopoverContent>
      </Popover>
    </>
  );
}
