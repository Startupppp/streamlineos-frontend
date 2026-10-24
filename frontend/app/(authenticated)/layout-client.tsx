"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import type { ShellVariant } from "@/lib/shell-variant";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAccessVersionSync } from "@/hooks/common/use-access-version-sync";
import { useNotificationEvents } from "@/features/notifications/use-notification-events";
import { useLogoutBroadcastListener } from "@/hooks/common/auth-hooks";
import { I18nProvider } from "@/lib/i18n/i18n";
import { BuildSidebarSkeleton } from "@/components/layout/sidebar/build-sidebar-skeleton";
import type { BuildSidebarSlotProps } from "@/components/layout/sidebar/build-sidebar-slot";
import { AuthenticatedProviders } from "@/components/providers/authenticated-providers";
import { RecordConversationSlotProvider } from "@/components/record-conversation/record-conversation-slot";

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

const ChatMobileBottomNav = dynamic(
  () =>
    import("@/features/chat/chat-mobile-bottom-nav").then(
      (m) => m.ChatMobileBottomNav,
    ),
  { ssr: false },
);

const RecordConversationPanel = dynamic(
  () =>
    import("@/features/chat/record-conversation-page").then(
      (m) => m.RecordConversationPanel,
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

const notificationBellSlot = <NotificationBell />;

function AccessVersionSync() {
  useAccessVersionSync();
  useNotificationEvents();
  useLogoutBroadcastListener();
  return null;
}

function renderBuildSidebar(props: BuildSidebarSlotProps) {
  return <BuildSidebar {...props} />;
}

function renderChatMobileNav(onOpenMobileMenu: () => void) {
  return <ChatMobileBottomNav onOpenMobileMenu={onOpenMobileMenu} />;
}

export function LayoutClient({ children, ...shellProps }: LayoutClientProps) {
  return (
    <I18nProvider>
      <AuthenticatedProviders>
        <RecordConversationSlotProvider render={RecordConversationPanel}>
          <DashboardShell
            {...shellProps}
            buildSidebarSlot={renderBuildSidebar}
            chatMobileNavSlot={renderChatMobileNav}
            notificationBellSlot={notificationBellSlot}
          >
            <AccessVersionSync />
            {children}
          </DashboardShell>
        </RecordConversationSlotProvider>
      </AuthenticatedProviders>
    </I18nProvider>
  );
}
