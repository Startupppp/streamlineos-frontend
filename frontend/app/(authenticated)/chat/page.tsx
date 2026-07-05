"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useChatHeartbeat, useChatChannels } from "@/hooks/api";
import { useChatGlobalNotifications } from "@/hooks/api/chat-notifications";
import { ChannelSidebar } from "@/features/chat/channel-sidebar";
import { MessagePanel } from "@/features/chat/message-panel";
import { ChannelInfoPanel } from "@/features/chat/channel-info-panel";
import { EmptyChatState } from "@/features/chat/empty-chat-state";
import { NewDMDialog } from "@/features/chat/new-dm-dialog";
import { NewGroupDialog } from "@/features/chat/new-group-dialog";
import { ChatAblyProvider } from "@/features/chat/ably-provider";
import { ChatTopNav } from "@/features/chat/chat-top-nav";

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

function ChatNotifications({
  activeChannelId,
  currentUserId,
}: {
  activeChannelId: number | null;
  currentUserId: string | undefined;
}) {
  const { data: channels } = useChatChannels();
  useChatGlobalNotifications(channels, activeChannelId, currentUserId);
  return null;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeChannelId, setActiveChannelId] = useState<number | null>(() => {
    const raw = searchParams.get("channel");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });
  const [showMobileList, setShowMobileList] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [pendingCallAction, setPendingCallAction] = useState<{
    channelId: number;
    type: "huddle" | "video";
  } | null>(null);
  const [emptyDMOpen, setEmptyDMOpen] = useState(false);
  const [emptyGroupOpen, setEmptyGroupOpen] = useState(false);
  const [showSearchFocus, setShowSearchFocus] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readChatSidebarCookie);

  const heartbeat = useChatHeartbeat();
  const heartbeatRef = useRef(heartbeat);
  // eslint-disable-next-line react-hooks/refs
  heartbeatRef.current = heartbeat;

  useEffect(() => {
    if (!currentUserId) return;
    heartbeatRef.current.mutate();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") heartbeatRef.current.mutate();
    }, 15_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") heartbeatRef.current.mutate();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUserId]);

  const handleSelectChannel = useCallback((channelId: number) => {
    setActiveChannelId(channelId);
    setShowMobileList(false);
  }, []);

  const consumedChannelParamRef = useRef(false);
  useEffect(() => {
    if (consumedChannelParamRef.current) return;
    if (!searchParams.get("channel")) return;
    consumedChannelParamRef.current = true;
    setShowMobileList(false);
    router.replace("/chat");
  }, [searchParams, router]);

  const handleSearchFocused = useCallback(() => setShowSearchFocus(false), []);
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      setChatSidebarCookie(next);
      return next;
    });
  }, []);
  const handleBack = useCallback(() => setShowMobileList(true), []);
  const handleToggleInfo = useCallback(() => setShowInfoPanel((p) => !p), []);
  const handleNewDM = useCallback(() => setEmptyDMOpen(true), []);
  const handleNewChannel = useCallback(() => setEmptyGroupOpen(true), []);
  const handleSearch = useCallback(() => {
    setShowMobileList(true);
    setShowSearchFocus(true);
  }, []);
  const handleCloseInfo = useCallback(() => setShowInfoPanel(false), []);
  const handleLeftChannel = useCallback(() => {
    setActiveChannelId(null);
    setShowInfoPanel(false);
    setShowMobileList(true);
  }, []);

  const handleArchived = useCallback(() => {
    setActiveChannelId(null);
    setShowInfoPanel(false);
    setShowMobileList(true);
  }, []);

  const handleOpenChannelSettings = useCallback((channelId: number) => {
    setActiveChannelId(channelId);
    setShowMobileList(false);
    setShowInfoPanel(true);
  }, []);

  const handleStartCallFromSidebar = useCallback(
    (channelId: number, type: "huddle" | "video") => {
      setActiveChannelId(channelId);
      setShowMobileList(false);
      setPendingCallAction({ channelId, type });
    },
    [],
  );

  const handleAutoStartHandled = useCallback(() => setPendingCallAction(null), []);

  return (
    <ChatAblyProvider>
      <ChatNotifications
        activeChannelId={activeChannelId}
        currentUserId={currentUserId}
      />
      <div className="flex flex-col h-full">
        <ChatTopNav />
        <div className="flex flex-1 overflow-hidden bg-background">
        <div
          className={cn(
            "relative flex flex-col shrink-0 border-r border-border/40 bg-card/50 transition-[width] duration-300 ease-in-out overflow-visible",
            "w-full",
            sidebarCollapsed ? "md:w-[3.5rem]" : "md:w-[300px] lg:w-[340px]",
            !showMobileList && "hidden md:flex",
          )}
        >
          <ChannelSidebar
            activeChannelId={activeChannelId}
            onSelectChannel={handleSelectChannel}
            currentUserId={currentUserId ?? ""}
            autoFocusSearch={showSearchFocus}
            onSearchFocused={handleSearchFocused}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            onStartCall={handleStartCallFromSidebar}
            onOpenSettings={handleOpenChannelSettings}
          />
        </div>

        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 relative",
            showMobileList && "hidden md:flex",
          )}
        >
          {activeChannelId && currentUserId ? (
            <MessagePanel
              channelId={activeChannelId}
              currentUserId={currentUserId}
              onBack={handleBack}
              onToggleInfo={handleToggleInfo}
              showInfoPanel={showInfoPanel}
              autoStartCall={
                pendingCallAction?.channelId === activeChannelId
                  ? pendingCallAction.type
                  : null
              }
              onAutoStartHandled={handleAutoStartHandled}
            />
          ) : (
            <EmptyChatState
              onNewDM={handleNewDM}
              onNewChannel={handleNewChannel}
              onSearch={handleSearch}
            />
          )}
        </div>

        <AnimatePresence>
          {showInfoPanel && activeChannelId && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="hidden lg:flex flex-col border-l border-border/40 bg-card/50 overflow-hidden shrink-0"
            >
              <ChannelInfoPanel
                channelId={activeChannelId}
                currentUserId={currentUserId ?? ""}
                onClose={handleCloseInfo}
                onLeftChannel={handleLeftChannel}
                onArchived={handleArchived}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <NewDMDialog
          open={emptyDMOpen}
          onOpenChange={setEmptyDMOpen}
          onCreated={handleSelectChannel}
          hideTrigger
        />
        <NewGroupDialog
          open={emptyGroupOpen}
          onOpenChange={setEmptyGroupOpen}
          onCreated={handleSelectChannel}
          hideTrigger
        />
        </div>
      </div>
    </ChatAblyProvider>
  );
}
