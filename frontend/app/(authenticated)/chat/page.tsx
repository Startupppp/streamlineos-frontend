"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useChatHeartbeat, useChatChannels } from "@/lib/api/hooks";
import { useChatGlobalNotifications } from "@/lib/api/hooks/chat-notifications";
import { ChannelSidebar } from "@/features/chat/channel-sidebar";
import { MessagePanel } from "@/features/chat/message-panel";
import { ChannelInfoPanel } from "@/features/chat/channel-info-panel";
import { EmptyChatState } from "@/features/chat/empty-chat-state";
import { NewDMDialog } from "@/features/chat/new-dm-dialog";
import { NewGroupDialog } from "@/features/chat/new-group-dialog";
import { ChatAblyProvider } from "@/features/chat/ably-provider";

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
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [emptyDMOpen, setEmptyDMOpen] = useState(false);
  const [emptyGroupOpen, setEmptyGroupOpen] = useState(false);
  const [showSearchFocus, setShowSearchFocus] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const heartbeat = useChatHeartbeat();
  const heartbeatRef = useRef(heartbeat);
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

  const handleSearchFocused = useCallback(() => setShowSearchFocus(false), []);
  const handleCollapseSidebar = useCallback(() => setSidebarCollapsed(true), []);
  const handleBack = useCallback(() => setShowMobileList(true), []);
  const handleToggleInfo = useCallback(() => setShowInfoPanel((p) => !p), []);
  const handleExpandSidebar = useCallback(() => setSidebarCollapsed(false), []);
  const handleNewDM = useCallback(() => setEmptyDMOpen(true), []);
  const handleNewChannel = useCallback(() => setEmptyGroupOpen(true), []);
  const handleSearch = useCallback(() => { setShowMobileList(true); setShowSearchFocus(true); }, []);
  const handleCloseInfo = useCallback(() => setShowInfoPanel(false), []);

  return (
    <ChatAblyProvider>
      <ChatNotifications activeChannelId={activeChannelId} currentUserId={currentUserId} />
    <div className="flex h-full overflow-hidden bg-background">

      <div
        className={cn(
          "flex flex-col shrink-0 border-r border-border/40 bg-card/50 transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden md:w-0" : "w-full md:w-[300px] lg:w-[340px]",
          !showMobileList && !sidebarCollapsed && "hidden md:flex"
        )}
      >
        <ChannelSidebar
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          currentUserId={currentUserId ?? ""}
          autoFocusSearch={showSearchFocus}
          onSearchFocused={handleSearchFocused}
          onCollapse={handleCollapseSidebar}
        />
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 relative",
          showMobileList && !sidebarCollapsed && "hidden md:flex"
        )}
      >
        {activeChannelId && currentUserId ? (
          <MessagePanel
            channelId={activeChannelId}
            currentUserId={currentUserId}
            onBack={handleBack}
            onToggleInfo={handleToggleInfo}
            showInfoPanel={showInfoPanel}
            sidebarCollapsed={sidebarCollapsed}
            onExpandSidebar={handleExpandSidebar}
          />
        ) : (
          <EmptyChatState
            onNewDM={handleNewDM}
            onNewChannel={handleNewChannel}
            onSearch={handleSearch}
            onExpandSidebar={sidebarCollapsed ? handleExpandSidebar : undefined}
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
            />
          </motion.div>
        )}
      </AnimatePresence>

      <NewDMDialog open={emptyDMOpen} onOpenChange={setEmptyDMOpen} onCreated={handleSelectChannel} hideTrigger />
      <NewGroupDialog open={emptyGroupOpen} onOpenChange={setEmptyGroupOpen} onCreated={handleSelectChannel} hideTrigger />
    </div>
    </ChatAblyProvider>
  );
}
