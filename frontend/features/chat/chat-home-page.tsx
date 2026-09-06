"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChannelSidebar } from "@/features/chat/channel-sidebar";
import { EmptyChatState } from "@/features/chat/empty-chat-state";
import { useChatSidebarCollapse } from "@/features/chat/chat-shell";
import {
  ChatOverlayFallback,
  ChatPanelFallback,
} from "@/features/chat/chat-lazy-fallbacks";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useShellVariant } from "@/components/layout/shell-variant-context";

const ChatAblySuite = dynamic(
  () =>
    import("@/features/chat/chat-ably-suite").then((m) => ({
      default: m.ChatAblySuite,
    })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading chat" /> },
);

const MessagePanel = dynamic(
  () =>
    import("@/features/chat/message-panel").then((m) => ({
      default: m.MessagePanel,
    })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading conversation" /> },
);

const ChannelInfoPanel = dynamic(
  () =>
    import("@/features/chat/channel-info-panel").then((m) => ({
      default: m.ChannelInfoPanel,
    })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading channel info" /> },
);

const NewDMDialog = dynamic(
  () =>
    import("@/features/chat/new-dm-dialog").then((m) => ({
      default: m.NewDMDialog,
    })),
  { ssr: false, loading: () => <ChatOverlayFallback label="Loading new message" /> },
);

const NewGroupDialog = dynamic(
  () =>
    import("@/features/chat/new-group-dialog").then((m) => ({
      default: m.NewGroupDialog,
    })),
  { ssr: false, loading: () => <ChatOverlayFallback label="Loading new channel" /> },
);

export function ChatHomePage() {
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
    type: "huddle";
  } | null>(null);
  const [emptyDMOpen, setEmptyDMOpen] = useState(false);
  const [emptyGroupOpen, setEmptyGroupOpen] = useState(false);
  const [showSearchFocus, setShowSearchFocus] = useState(false);
  const { sidebarCollapsed, handleToggleSidebar } = useChatSidebarCollapse();
  const isMobile = useShellVariant() === "mobile";

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

  const consumedDmParamRef = useRef(false);
  useEffect(() => {
    if (consumedDmParamRef.current) return;
    if (searchParams.get("dm") !== "1") return;
    consumedDmParamRef.current = true;
    setEmptyDMOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("dm");
    router.replace(`/chat${next.size > 0 ? `?${next.toString()}` : ""}`);
  }, [searchParams, router]);

  const handleSearchFocused = useCallback(() => setShowSearchFocus(false), []);
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
    (channelId: number, type: "huddle") => {
      setActiveChannelId(channelId);
      setShowMobileList(false);
      setPendingCallAction({ channelId, type });
    },
    [],
  );

  const handleAutoStartHandled = useCallback(() => setPendingCallAction(null), []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("chat:conversation-change", {
        detail: activeChannelId !== null && !showMobileList,
      }),
    );
  }, [activeChannelId, showMobileList]);

  useEffect(() => {
    const handleOpenNewDM = () => setEmptyDMOpen(true);
    const handleOpenNewChannel = () => setEmptyGroupOpen(true);
    window.addEventListener("chat:open-new-dm", handleOpenNewDM);
    window.addEventListener("chat:open-new-channel", handleOpenNewChannel);
    return () => {
      window.removeEventListener("chat:open-new-dm", handleOpenNewDM);
      window.removeEventListener("chat:open-new-channel", handleOpenNewChannel);
    };
  }, []);

  const panelChildren = activeChannelId && currentUserId ? (
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
      isSidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={handleToggleSidebar}
    />
  ) : (
    <EmptyChatState
      onNewDM={handleNewDM}
      onNewChannel={handleNewChannel}
      onSearch={handleSearch}
      isSidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={handleToggleSidebar}
    />
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex flex-1 min-h-0 min-w-0 bg-background">
        <div
          className={cn(
            "relative z-0 flex flex-col shrink-0 border-r border-border/40 bg-card/50 transition-[width] duration-300 ease-in-out overflow-hidden",
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
            onStartCall={handleStartCallFromSidebar}
            onOpenSettings={handleOpenChannelSettings}
          />
        </div>

        <div
          className={cn(
            "relative z-10 flex-1 flex flex-col min-w-0",
            isMobile && showMobileList && "hidden",
          )}
        >
          <ChatAblySuite
            activeChannelId={activeChannelId}
            currentUserId={currentUserId}
          >
            {isMobile && showMobileList ? null : panelChildren}
          </ChatAblySuite>
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

        {activeChannelId && (
          <Sheet open={showInfoPanel} onOpenChange={setShowInfoPanel}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 lg:hidden">
              <SheetTitle className="sr-only">Channel info</SheetTitle>
              <ChannelInfoPanel
                channelId={activeChannelId}
                currentUserId={currentUserId ?? ""}
                onClose={handleCloseInfo}
                onLeftChannel={handleLeftChannel}
                onArchived={handleArchived}
              />
            </SheetContent>
          </Sheet>
        )}

        {emptyDMOpen && (
          <NewDMDialog
            open
            onOpenChange={setEmptyDMOpen}
            onCreated={handleSelectChannel}
            hideTrigger
          />
        )}
        {emptyGroupOpen && (
          <NewGroupDialog
            open
            onOpenChange={setEmptyGroupOpen}
            onCreated={handleSelectChannel}
            hideTrigger
          />
        )}
      </div>
    </div>
  );
}
