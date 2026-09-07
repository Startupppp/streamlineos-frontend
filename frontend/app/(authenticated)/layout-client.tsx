"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ChatMobileBottomNav } from "@/features/chat/chat-mobile-bottom-nav";
import type { ModuleAccent } from "@/components/layout/sidebar/sidebar-nav-items";
import type { ShellVariant } from "@/lib/shell-variant";

const ProjectNavTree = dynamic(
  () =>
    import("@/features/build/sidebar/project-nav-tree").then(
      (m) => m.ProjectNavTree,
    ),
  { ssr: false },
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

function renderProjectNavTree(props: {
  projectId: string;
  collapsed: boolean;
  accent: ModuleAccent;
  onNavigate: () => void;
}) {
  return <ProjectNavTree {...props} />;
}

function renderChatMobileNav(onOpenMobileMenu: () => void) {
  return <ChatMobileBottomNav onOpenMobileMenu={onOpenMobileMenu} />;
}

const notificationBellSlot = <NotificationBell />;

export function LayoutClient({ children, ...shellProps }: LayoutClientProps) {
  return (
    <DashboardShell
      {...shellProps}
      projectNavTreeSlot={renderProjectNavTree}
      chatMobileNavSlot={renderChatMobileNav}
      notificationBellSlot={notificationBellSlot}
    >
      {children}
    </DashboardShell>
  );
}
