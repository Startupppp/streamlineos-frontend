"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChannelSidebar } from "./channel-sidebar";
import { getChatSidebarClassName } from "./chat-shell-layout";

const CHAT_SIDEBAR_COOKIE = "chat-sidebar-collapsed";

function readChatSidebarCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${CHAT_SIDEBAR_COOKIE}=true`);
}

function setChatSidebarCookie(collapsed: boolean) {
  document.cookie = `${CHAT_SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface ChatShellProps {
  children: React.ReactNode;
  activeChannelId?: number | null;
  onSelectChannel?: (channelId: number) => void;
  autoFocusSearch?: boolean;
  onSearchFocused?: () => void;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}

export function ChatShell({
  children,
  activeChannelId = null,
  onSelectChannel,
  autoFocusSearch,
  onSearchFocused,
  onStartCall,
  onOpenSettings,
}: ChatShellProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { sidebarCollapsed } = useChatSidebarCollapse();

  const handleSelectChannel = useCallback(
    (channelId: number) => {
      if (onSelectChannel) {
        onSelectChannel(channelId);
        return;
      }
      router.push(`/chat?channel=${channelId}`);
    },
    [onSelectChannel, router],
  );

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background">
      <div
        className={getChatSidebarClassName(sidebarCollapsed)}
      >
        <ChannelSidebar
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          currentUserId={session?.user?.id ?? ""}
          autoFocusSearch={autoFocusSearch}
          onSearchFocused={onSearchFocused}
          isCollapsed={sidebarCollapsed}
          onStartCall={onStartCall}
          onOpenSettings={onOpenSettings}
        />
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}

export function useChatSidebarCollapse() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readChatSidebarCookie);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      setChatSidebarCookie(next);
      return next;
    });
  }, []);

  return { sidebarCollapsed, handleToggleSidebar, setSidebarCollapsed };
}
