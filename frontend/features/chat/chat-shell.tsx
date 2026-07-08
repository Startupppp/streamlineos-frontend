"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { ChannelSidebar } from "./channel-sidebar";

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
  showMobileSidebar?: boolean;
  autoFocusSearch?: boolean;
  onSearchFocused?: () => void;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
  compactMobileSidebar?: boolean;
}

export function ChatShell({
  children,
  activeChannelId = null,
  onSelectChannel,
  showMobileSidebar = true,
  autoFocusSearch,
  onSearchFocused,
  onStartCall,
  onOpenSettings,
  compactMobileSidebar = false,
}: ChatShellProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
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

  const effectiveCollapsed =
    sidebarCollapsed || (compactMobileSidebar && isMobile);

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background">
      <div
        className={cn(
          "relative z-0 flex flex-col shrink-0 border-r border-border/40 bg-card/50 transition-[width] duration-300 ease-in-out overflow-hidden",
          compactMobileSidebar ? "w-14" : "w-full",
          effectiveCollapsed ? "md:w-[3.5rem]" : "md:w-[300px] lg:w-[340px]",
          !showMobileSidebar && !compactMobileSidebar && "hidden md:flex",
        )}
      >
        <ChannelSidebar
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          currentUserId={session?.user?.id ?? ""}
          autoFocusSearch={autoFocusSearch}
          onSearchFocused={onSearchFocused}
          isCollapsed={effectiveCollapsed}
          onStartCall={onStartCall}
          onOpenSettings={onOpenSettings}
        />
      </div>

      <div
        className={cn(
          "relative z-10 flex-1 flex flex-col min-w-0 min-h-0",
          showMobileSidebar && !compactMobileSidebar && "hidden md:flex",
        )}
      >
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
