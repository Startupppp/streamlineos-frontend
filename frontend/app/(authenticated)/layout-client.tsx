"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ChatMobileBottomNav } from "@/features/chat/chat-mobile-bottom-nav";
import { useAccessVersionSync } from "@/hooks/common/use-access-version-sync";
import { useNotificationEvents } from "@/features/notifications/use-notification-events";
import { BuildSidebarSkeleton } from "@/features/build/navigation/build-sidebar-skeleton";
import type { BuildSidebarSlotProps } from "@/components/layout/sidebar/build-sidebar-slot";
import type { ShellVariant } from "@/lib/shell-variant";

const BuildSidebar = dynamic(
  () =>
    import("@/features/build/navigation/build-sidebar").then(
      (m) => m.BuildSidebar,
    ),
  { ssr: false, loading: () => <BuildSidebarSkeleton /> },
);

const NotificationBell = dynamic(
  () =>
    import("@/features/notifications/notification-bell").then(
      (m) => m.NotificationBell,
    ),
  { ssr: false },
);

interface LayoutClientProps {
  children: ReactNode;
  userId: string;
  defaultCollapsed: boolean;
  shellVariant?: ShellVariant;
  createTicketDialog?: ReactNode;
}

function renderBuildSidebar(props: BuildSidebarSlotProps) {
  return <BuildSidebar {...props} />;
}

function renderChatMobileNav(onOpenMobileMenu: () => void) {
  return <ChatMobileBottomNav onOpenMobileMenu={onOpenMobileMenu} />;
}

const notificationBellSlot = <NotificationBell />;

function AccessVersionSync() {
  useAccessVersionSync();
  useNotificationEvents();
  return null;
}

export function LayoutClient({ children, ...shellProps }: LayoutClientProps) {
  return (
    <DashboardShell
      {...shellProps}
      buildSidebarSlot={renderBuildSidebar}
      chatMobileNavSlot={renderChatMobileNav}
      notificationBellSlot={notificationBellSlot}
    >
      <AccessVersionSync />
      {children}
    </DashboardShell>
  );
}
