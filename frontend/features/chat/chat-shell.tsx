"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getChatConversationListPaneClassName,
  getChatMessagePaneClassName,
} from "./chat-shell-layout";

const CHAT_SIDEBAR_COOKIE = "chat-sidebar-collapsed";
const SKELETON_ROW_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SKELETON_FILTER_WIDTHS = ["w-10", "w-16", "w-12", "w-20"] as const;

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
  sidebar: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  showConversationList: boolean;
  sidebarCollapsed: boolean;
}

export function ChatShell({
  sidebar,
  children,
  aside,
  showConversationList,
  sidebarCollapsed,
}: ChatShellProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-background">
      <div
        className={getChatConversationListPaneClassName(
          sidebarCollapsed,
          showConversationList,
        )}
      >
        {sidebar}
      </div>
      <div className={getChatMessagePaneClassName(showConversationList)}>
        {children}
      </div>
      {aside}
    </div>
  );
}

export function ChatShellSkeleton({ notice }: { notice?: ReactNode }) {
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background"
      aria-busy="true"
    >
      <span role="status" aria-label="Loading chat" className="sr-only">
        Loading chat…
      </span>
      <div className={getChatConversationListPaneClassName(false, true)}>
        <div className="flex flex-col gap-2 px-3 pt-2 pb-2 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="flex gap-1">
            {SKELETON_FILTER_WIDTHS.map((width) => (
              <Skeleton key={width} className={`h-9 rounded-md ${width}`} />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-hidden px-2">
          {notice}
          {SKELETON_ROW_KEYS.map((key) => (
            <div key={key} className="flex min-h-14 items-center gap-3 px-2 py-2">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={getChatMessagePaneClassName(true)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Skeleton className="h-44 w-44 rounded-full" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-border/40 p-3">
          <Skeleton className="h-11 rounded-md" />
          <Skeleton className="h-11 rounded-md" />
          <Skeleton className="h-11 rounded-md" />
        </div>
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

  return { sidebarCollapsed, handleToggleSidebar };
}
