"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChannelSidebar,
  type ChatCreateDialog,
} from "@/features/chat/channel-sidebar";
import { EmptyChatState } from "@/features/chat/empty-chat-state";
import {
  ChatShell,
  ChatShellSkeleton,
  useChatSidebarCollapse,
} from "@/features/chat/chat-shell";
import { ChatPanelFallback } from "@/features/chat/chat-lazy-fallbacks";
import { readChatSearchScope } from "@/features/chat/chat-search-scope";
import { useChatHomeUrl } from "@/features/chat/use-chat-home-url";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { StalledReadNotice } from "@/components/shared/stalled-read-notice";
import { usePageState } from "@/hooks/api/use-page-state";
import { useChatChannels } from "@/hooks/api/chat-core-read";
import {
  PANEL_STALLED_AFTER_MS,
  useStalledAfter,
} from "@/hooks/common/use-stalled-after";
import { useIsChatPanelNarrow } from "@/features/chat/use-chat-mobile";
import { useMobilePanelBack } from "@/features/chat/use-mobile-panel-back";

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
  {
    ssr: false,
    loading: () => <ChatPanelFallback label="Loading conversation" />,
  },
);

const ChannelInfoPanel = dynamic(
  () =>
    import("@/features/chat/channel-info-panel").then((m) => ({
      default: m.ChannelInfoPanel,
    })),
  {
    ssr: false,
    loading: () => <ChatPanelFallback label="Loading channel info" />,
  },
);

export function ChatHomePage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const {
    activeChannelId,
    messageId,
    searchScope,
    dmRequested,
    joinHuddleRequested,
    navigateToConversation,
    setSearchScope: handleSearchScopeChange,
    clearDmParam,
    clearJoinHuddleParam,
    closeConversation,
    leaveMessage,
  } = useChatHomeUrl();
  const showConversationList = activeChannelId === null;

  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [pendingCallAction, setPendingCallAction] = useState<{
    channelId: number;
    type: "huddle";
  } | null>(null);
  const [createDialogOverride, setCreateDialogOverride] =
    useState<ChatCreateDialog | null>(() => (dmRequested ? "dm" : null));
  const createDialog =
    createDialogOverride ?? (dmRequested ? "dm" : null);
  const { sidebarCollapsed, handleToggleSidebar } = useChatSidebarCollapse();
  const isPanelNarrow = useIsChatPanelNarrow();

  const {
    channels,
    isLoading: channelsLoading,
    isError: channelsError,
    error: channelsErrorValue,
    refetch: refetchChannels,
  } = useChatChannels();
  const channelsStalled = useStalledAfter(channelsLoading, PANEL_STALLED_AFTER_MS);
  const pageState = usePageState({
    permission: "chat:channels:read",
    isLoading: channelsLoading,
    isError: channelsError && channels.length === 0,
    error: channelsErrorValue,
  });

  const openConversation = useCallback(
    (channelId: number, targetMessageId: number | null) => {
      setCreateDialogOverride(null);
      navigateToConversation(channelId, targetMessageId);
    },
    [navigateToConversation],
  );

  const handleSelectChannel = useCallback(
    (channelId: number) => openConversation(channelId, null),
    [openConversation],
  );

  const handleOpenMessage = useCallback(
    (channelId: number, targetMessageId: number) =>
      openConversation(channelId, targetMessageId),
    [openConversation],
  );

  const handleCreateDialogChange = useCallback(
    (dialog: ChatCreateDialog | null) => {
      setCreateDialogOverride(dialog);
      if (dmRequested) clearDmParam();
    },
    [dmRequested, clearDmParam],
  );

  const handleBack = useCallback(() => closeConversation("push"), [closeConversation]);

  const handleConversationGone = useCallback(() => {
    setShowInfoPanel(false);
    closeConversation("replace");
  }, [closeConversation]);

  const handleOpenChannelSettings = useCallback(
    (channelId: number) => {
      setShowInfoPanel(true);
      handleSelectChannel(channelId);
    },
    [handleSelectChannel],
  );

  const handleStartCallFromSidebar = useCallback(
    (channelId: number, type: "huddle") => {
      setPendingCallAction({ channelId, type });
      handleSelectChannel(channelId);
    },
    [handleSelectChannel],
  );

  const handleAutoStartHandled = useCallback(() => setPendingCallAction(null), []);
  const handleToggleInfo = useCallback(() => setShowInfoPanel((p) => !p), []);
  const handleCloseInfo = useCallback(() => setShowInfoPanel(false), []);
  useMobilePanelBack(showInfoPanel && activeChannelId !== null, handleCloseInfo);
  const handleOpenNewDM = useCallback(() => setCreateDialogOverride("dm"), []);
  const handleOpenNewChannel = useCallback(
    () => setCreateDialogOverride("channel"),
    [],
  );
  const handleOpenSearch = useCallback(
    () => handleSearchScopeChange("messages"),
    [handleSearchScopeChange],
  );

  const consumeDmParam = dmRequested && createDialogOverride === "dm";
  useEffect(() => {
    if (consumeDmParam) clearDmParam();
  }, [consumeDmParam, clearDmParam]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("chat:conversation-change", {
        detail: activeChannelId !== null,
      }),
    );
  }, [activeChannelId]);

  useEffect(() => {
    function handleOpenSearchEvent(event: Event) {
      const requested =
        event instanceof CustomEvent ? readChatSearchScope(event.detail) : null;
      handleSearchScopeChange(requested ?? "messages");
    }
    window.addEventListener("chat:open-new-dm", handleOpenNewDM);
    window.addEventListener("chat:open-new-channel", handleOpenNewChannel);
    window.addEventListener("chat:open-search", handleOpenSearchEvent);
    return () => {
      window.removeEventListener("chat:open-new-dm", handleOpenNewDM);
      window.removeEventListener("chat:open-new-channel", handleOpenNewChannel);
      window.removeEventListener("chat:open-search", handleOpenSearchEvent);
    };
  }, [
    handleOpenNewDM,
    handleOpenNewChannel,
    handleSearchScopeChange,
  ]);

  const panelChildren =
    activeChannelId && currentUserId ? (
      <MessagePanel
        key={activeChannelId}
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
        scrollToMessageId={messageId}
        onLeaveMessage={leaveMessage}
        joinHuddleRequested={joinHuddleRequested}
        onJoinHuddleHandled={clearJoinHuddleParam}
      />
    ) : (
      <EmptyChatState
        onNewDM={handleOpenNewDM}
        onNewChannel={handleOpenNewChannel}
        onSearch={handleOpenSearch}
      />
    );

  const infoPanel = activeChannelId ? (
    <>
      <AnimatePresence>
        {showInfoPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col border-l border-border bg-card overflow-hidden shrink-0"
          >
            <ChannelInfoPanel
              channelId={activeChannelId}
              currentUserId={currentUserId ?? ""}
              onClose={handleCloseInfo}
              onLeftChannel={handleConversationGone}
              onArchived={handleConversationGone}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {isPanelNarrow && (
        <Sheet open={showInfoPanel} onOpenChange={setShowInfoPanel}>
          <SheetContent showCloseButton={false} className="flex w-full flex-col gap-0 overflow-hidden p-0">
            <SheetTitle className="sr-only">Channel info</SheetTitle>
            <ChannelInfoPanel
              channelId={activeChannelId}
              currentUserId={currentUserId ?? ""}
              onClose={handleCloseInfo}
              onLeftChannel={handleConversationGone}
              onArchived={handleConversationGone}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  ) : null;

  return (
    <PageWrapper
      noInternalScroll
      contentClassName="!px-0"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <h1 className="sr-only">Chat</h1>
      <PageState
        resolution={pageState}
        onRetry={refetchChannels}
        loading={
          <ChatShellSkeleton
            notice={
              channelsStalled ? (
                <StalledReadNotice
                  subject="conversations"
                  onRetry={refetchChannels}
                />
              ) : null
            }
          />
        }
      >
        <ChatShell
          showConversationList={showConversationList}
          sidebarCollapsed={sidebarCollapsed}
          aside={infoPanel}
          sidebar={
            <ChannelSidebar
              activeChannelId={activeChannelId}
              currentUserId={currentUserId ?? ""}
              isCollapsed={sidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              onSelectChannel={handleSelectChannel}
              onOpenMessage={handleOpenMessage}
              onStartCall={handleStartCallFromSidebar}
              onOpenSettings={handleOpenChannelSettings}
              createDialog={createDialog}
              onCreateDialogChange={handleCreateDialogChange}
              searchScope={searchScope}
              onSearchScopeChange={handleSearchScopeChange}
            />
          }
        >
          <ChatAblySuite
            activeChannelId={activeChannelId}
            currentUserId={currentUserId}
          >
            {panelChildren}
          </ChatAblySuite>
        </ChatShell>
      </PageState>
    </PageWrapper>
  );
}
