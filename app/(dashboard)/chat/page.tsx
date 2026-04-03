"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatHeartbeat } from "@/lib/hooks/trpc-hooks";
import { ChannelSidebar } from "./_components/channel-sidebar";
import { MessagePanel } from "./_components/message-panel";
import { ChannelInfoPanel } from "./_components/channel-info-panel";
import { EmptyChatState } from "./_components/empty-chat-state";
import { NewDMDialog } from "./_components/new-dm-dialog";
import { NewGroupDialog } from "./_components/new-group-dialog";
import { ChatAblyProvider } from "./_components/ably-provider";

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

  return (
    <ChatAblyProvider>
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar */}
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
          onSearchFocused={() => setShowSearchFocus(false)}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      </div>

      {/* Messages */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 relative",
          showMobileList && "hidden md:flex"
        )}
      >
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-3 left-3 z-10 h-8 w-8 rounded-lg bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border/50"
            aria-label="Open conversations"
          >
            <MessageSquareText className="h-4 w-4" />
          </button>
        )}
        {activeChannelId && currentUserId ? (
          <MessagePanel
            channelId={activeChannelId}
            currentUserId={currentUserId}
            onBack={() => setShowMobileList(true)}
            onToggleInfo={() => setShowInfoPanel((p) => !p)}
            showInfoPanel={showInfoPanel}
          />
        ) : (
          <EmptyChatState
            onNewDM={() => setEmptyDMOpen(true)}
            onNewChannel={() => setEmptyGroupOpen(true)}
            onSearch={() => { setShowMobileList(true); setShowSearchFocus(true); }}
          />
        )}
      </div>

      {/* Info Panel */}
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
              onClose={() => setShowInfoPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page-level dialogs for empty state */}
      <NewDMDialog open={emptyDMOpen} onOpenChange={setEmptyDMOpen} onCreated={handleSelectChannel} hideTrigger />
      <NewGroupDialog open={emptyGroupOpen} onOpenChange={setEmptyGroupOpen} onCreated={handleSelectChannel} hideTrigger />
    </div>
    </ChatAblyProvider>
  );
}
