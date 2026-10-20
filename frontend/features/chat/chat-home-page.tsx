"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
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
import {
  readChatSearchScope,
  type ChatSearchScope,
} from "@/features/chat/chat-search-scope";
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

type UrlWrite = "push" | "replace";

function readPositiveIntParam(
  params: ReadonlyURLSearchParams,
  name: string,
): number | null {
  const raw = params.get(name);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function ChatHomePage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChannelId = readPositiveIntParam(searchParams, "channel");
  const messageId =
    activeChannelId === null ? null : readPositiveIntParam(searchParams, "message");
  const searchScope = readChatSearchScope(searchParams.get("search"));
  const dmRequested = searchParams.get("dm") === "1";
  const showConversationList = activeChannelId === null;

  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [pendingCallAction, setPendingCallAction] = useState<{
    channelId: number;
    type: "huddle";
  } | null>(null);
  const [createDialogOverride, setCreateDialogOverride] =
    useState<ChatCreateDialog | null>(null);
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

  const writeUrl = useCallback(
    (mode: UrlWrite, update: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      update(next);
      const query = next.toString();
      const href = query ? `/chat?${query}` : "/chat";
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [searchParams, router],
  );

  const handleSelectChannel = useCallback(
    (channelId: number) => {
      setCreateDialogOverride(null);
      const unchanged =
        channelId === activeChannelId &&
        !searchParams.has("message") &&
        !searchParams.has("search") &&
        !searchParams.has("dm");
      if (unchanged) return;
      writeUrl("push", (next) => {
        next.set("channel", String(channelId));
        next.delete("message");
        next.delete("search");
        next.delete("dm");
      });
    },
    [activeChannelId, searchParams, writeUrl],
  );

  const handleOpenMessage = useCallback(
    (channelId: number, targetMessageId: number) => {
      setCreateDialogOverride(null);
      writeUrl("push", (next) => {
        next.set("channel", String(channelId));
        next.set("message", String(targetMessageId));
        next.delete("search");
        next.delete("dm");
      });
    },
    [writeUrl],
  );

  const handleSearchScopeChange = useCallback(
    (scope: ChatSearchScope | null) => {
      writeUrl("replace", (next) => {
        if (scope === null) next.delete("search");
        else next.set("search", scope);
      });
    },
    [writeUrl],
  );

  const handleCreateDialogChange = useCallback(
    (dialog: ChatCreateDialog | null) => {
      setCreateDialogOverride(dialog);
      if (dmRequested) writeUrl("replace", (next) => next.delete("dm"));
    },
    [dmRequested, writeUrl],
  );

  const handleBack = useCallback(() => {
    writeUrl("push", (next) => {
      next.delete("channel");
      next.delete("message");
    });
  }, [writeUrl]);

  const handleConversationGone = useCallback(() => {
    setShowInfoPanel(false);
    writeUrl("replace", (next) => {
      next.delete("channel");
      next.delete("message");
    });
  }, [writeUrl]);

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

  const handleAutoStartHandled = useCallback(
    () => setPendingCallAction(null),
    [],
  );
  const handleToggleInfo = useCallback(() => setShowInfoPanel((p) => !p), []);
  const handleCloseInfo = useCallback(() => setShowInfoPanel(false), []);
  const handleOpenNewDM = useCallback(() => setCreateDialogOverride("dm"), []);
  const handleOpenNewChannel = useCallback(
    () => setCreateDialogOverride("channel"),
    [],
  );
  const handleOpenSearch = useCallback(
    () => handleSearchScopeChange("messages"),
    [handleSearchScopeChange],
  );

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
    function handleMessageUnavailable(event: Event) {
      if (!(event instanceof CustomEvent) || event.detail !== messageId) return;
      writeUrl("replace", (next) => next.delete("message"));
    }
    window.addEventListener("chat:open-new-dm", handleOpenNewDM);
    window.addEventListener("chat:open-new-channel", handleOpenNewChannel);
    window.addEventListener("chat:open-search", handleOpenSearchEvent);
    window.addEventListener("chat:message-unavailable", handleMessageUnavailable);
    return () => {
      window.removeEventListener("chat:open-new-dm", handleOpenNewDM);
      window.removeEventListener("chat:open-new-channel", handleOpenNewChannel);
      window.removeEventListener("chat:open-search", handleOpenSearchEvent);
      window.removeEventListener(
        "chat:message-unavailable",
        handleMessageUnavailable,
      );
    };
  }, [
    handleOpenNewDM,
    handleOpenNewChannel,
    handleSearchScopeChange,
    messageId,
    writeUrl,
  ]);

  const panelChildren =
    activeChannelId && currentUserId ? (
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
        scrollToMessageId={messageId}
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
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0">
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
