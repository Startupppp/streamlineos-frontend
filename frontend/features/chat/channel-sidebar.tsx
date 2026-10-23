"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useChatChannels,
  useArchivedChannels,
  useChatOnlineUsers,
} from "@/hooks/api/chat-core-read";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ChannelSectionList } from "./channel-section-list";
import { ChatOverlayFallback } from "./chat-lazy-fallbacks";
import { ChannelSidebarHeader } from "./channel-sidebar-header";
import { ChannelInboxSections } from "./channel-inbox-sections";
import { handleConversationListKeyDown } from "./chat-inbox-keys";
import {
  channelMatchesInboxFilter,
  countChatInboxFilters,
  readChatInboxFilter,
  withChatInboxFilter,
  type ChatInboxFilter,
} from "./chat-inbox-filter";
import type { ChatSearchScope } from "./chat-search-scope";

const NewDMDialog = dynamic(
  () => import("./new-dm-dialog").then((m) => ({ default: m.NewDMDialog })),
  {
    ssr: false,
    loading: () => <ChatOverlayFallback label="Loading new message" />,
  },
);

const NewGroupDialog = dynamic(
  () =>
    import("./new-group-dialog").then((m) => ({ default: m.NewGroupDialog })),
  {
    ssr: false,
    loading: () => <ChatOverlayFallback label="Loading new channel" />,
  },
);

const ChatSearchDialog = dynamic(
  () =>
    import("./chat-search-dialog").then((m) => ({
      default: m.ChatSearchDialog,
    })),
  {
    ssr: false,
    loading: () => <ChatOverlayFallback label="Loading chat search" />,
  },
);

export type ChatCreateDialog = "dm" | "channel";

interface ChannelSidebarProps {
  activeChannelId: number | null;
  currentUserId: string;
  isCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onSelectChannel: (id: number) => void;
  onOpenMessage: (channelId: number, messageId: number) => void;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
  createDialog: ChatCreateDialog | null;
  onCreateDialogChange: (dialog: ChatCreateDialog | null) => void;
  searchScope: ChatSearchScope | null;
  onSearchScopeChange: (scope: ChatSearchScope | null) => void;
}

export function ChannelSidebar({
  activeChannelId,
  currentUserId,
  isCollapsed = false,
  onToggleSidebar,
  onSelectChannel,
  onOpenMessage,
  onStartCall,
  onOpenSettings,
  createDialog,
  onCreateDialogChange,
  searchScope,
  onSearchScopeChange,
}: ChannelSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inboxFilter = readChatInboxFilter(searchParams.get("inbox"));
  const {
    channels,
    hasMore: hasMoreChannels,
    isTruncated: channelsTruncated,
    isFetchingNextPage: isLoadingMoreChannels,
    loadMore: loadMoreChannels,
  } = useChatChannels();
  const {
    channels: archivedChannels,
    isLoading: isArchivedLoading,
    hasMore: hasMoreArchived,
    isFetchingNextPage: isLoadingMoreArchived,
    loadMore: loadMoreArchived,
  } = useArchivedChannels();
  const { data: onlineUsers } = useChatOnlineUsers();
  const [showArchived, setShowArchived] = useState(false);
  const { iconRef: collapseIconRef, hoverHandlers: collapseHoverHandlers } =
    useAnimatedIcon();

  const writeInboxFilter = useCallback(
    (filter: ChatInboxFilter) => {
      const query = withChatInboxFilter(
        new URLSearchParams(searchParams.toString()),
        filter,
      );
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );
  const handleClearFilters = useCallback(
    () => writeInboxFilter("all"),
    [writeInboxFilter],
  );
  const handleOpenArchived = useCallback(() => setShowArchived(true), []);
  const handleCloseArchived = useCallback(() => setShowArchived(false), []);
  const handleOpenNewDM = useCallback(
    () => onCreateDialogChange("dm"),
    [onCreateDialogChange],
  );
  const handleOpenNewChannel = useCallback(
    () => onCreateDialogChange("channel"),
    [onCreateDialogChange],
  );
  const handleOpenSearch = useCallback(
    () => onSearchScopeChange("messages"),
    [onSearchScopeChange],
  );
  const handleCreateDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onCreateDialogChange(null);
    },
    [onCreateDialogChange],
  );
  const handleSearchOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onSearchScopeChange(null);
    },
    [onSearchScopeChange],
  );

  const onlineUserIds = useMemo(() => {
    const ids = new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []);
    ids.add(currentUserId);
    return ids;
  }, [onlineUsers, currentUserId]);

  const archivedUnreadCount = useMemo(
    () => archivedChannels.reduce((sum, ch) => sum + ch.unreadCount, 0),
    [archivedChannels],
  );

  const visibleChannels = useMemo(
    () =>
      channels.filter((channel) =>
        channelMatchesInboxFilter(channel, inboxFilter),
      ),
    [channels, inboxFilter],
  );

  const unreadTotal = useMemo(
    () => channels.reduce((sum, channel) => sum + channel.unreadCount, 0),
    [channels],
  );

  const inboxCounts = useMemo(() => countChatInboxFilters(channels), [channels]);

  const starred = useMemo(
    () =>
      visibleChannels.filter(
        (c) => c.members?.find((m) => m.user?.id === currentUserId)?.isFavorite,
      ),
    [visibleChannels, currentUserId],
  );

  const conversations = useMemo(() => {
    const starredIds = new Set(starred.map((c) => c.id));
    return visibleChannels.filter((c) => !starredIds.has(c.id));
  }, [visibleChannels, starred]);

  const compactChannels = useMemo(
    () => [...starred, ...conversations],
    [starred, conversations],
  );

  return (
    <TooltipProvider>
      <div className="relative flex h-full flex-col overflow-visible">
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={
              isCollapsed ? "Expand channel sidebar" : "Collapse channel sidebar"
            }
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            {...collapseHoverHandlers}
            className={cn(
              "hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex",
              isCollapsed
                ? "mt-2 mb-1 self-center"
                : "absolute top-14 right-0 z-30 translate-x-1/2 border border-border/40 bg-card shadow-sm",
            )}
          >
            {isCollapsed ? (
              <ChevronRightIcon ref={collapseIconRef} size={16} />
            ) : (
              <ChevronLeftIcon ref={collapseIconRef} size={16} />
            )}
          </button>
        ) : null}

        <ChannelSidebarHeader
          isCollapsed={isCollapsed}
          onlineUserCount={onlineUserIds.size}
          unreadTotal={unreadTotal}
          inboxFilter={inboxFilter}
          inboxCounts={inboxCounts}
          onInboxFilter={writeInboxFilter}
          showArchived={showArchived}
          onOpenNewDM={handleOpenNewDM}
          onOpenNewChannel={handleOpenNewChannel}
          onOpenSearch={handleOpenSearch}
        />

        <ScrollArea
          className={cn("flex-1", isCollapsed ? "px-2 lg:px-1" : "px-2")}
        >
          <div onKeyDown={handleConversationListKeyDown}>
            <p className="sr-only">
              Use the arrow keys to move between conversations.
            </p>
            <div className={cn("hidden pb-1", isCollapsed && "lg:block")}>
              <ChannelSectionList
                channels={compactChannels}
                label="Conversations"
                compact
                className="flex flex-col items-center gap-1"
                activeChannelId={activeChannelId}
                currentUserId={currentUserId}
                onlineUserIds={onlineUserIds}
                onSelectChannel={onSelectChannel}
              />
            </div>
            <ChannelInboxSections
              inboxFilter={inboxFilter}
              isCollapsed={isCollapsed}
              showArchived={showArchived}
              starred={starred}
              conversations={conversations}
              archivedChannels={archivedChannels}
              archivedUnreadCount={archivedUnreadCount}
              isArchivedLoading={isArchivedLoading}
              hasMoreArchived={hasMoreArchived}
              isLoadingMoreArchived={isLoadingMoreArchived}
              onLoadMoreArchived={loadMoreArchived}
              onOpenArchived={handleOpenArchived}
              onCloseArchived={handleCloseArchived}
              activeChannelId={activeChannelId}
              currentUserId={currentUserId}
              onlineUserIds={onlineUserIds}
              onSelectChannel={onSelectChannel}
              onStartCall={onStartCall}
              onOpenSettings={onOpenSettings}
              hasMoreChannels={hasMoreChannels}
              channelsTruncated={channelsTruncated}
              isLoadingMoreChannels={isLoadingMoreChannels}
              onLoadMoreChannels={loadMoreChannels}
              onClearFilters={handleClearFilters}
            />
          </div>
        </ScrollArea>

        {searchScope && (
          <ChatSearchDialog
            scope={searchScope}
            onScopeChange={onSearchScopeChange}
            onOpenChange={handleSearchOpenChange}
            onSelectChannel={onSelectChannel}
            onOpenMessage={onOpenMessage}
          />
        )}
        {createDialog === "dm" && (
          <NewDMDialog
            onOpenChange={handleCreateDialogOpenChange}
            onCreated={onSelectChannel}
          />
        )}
        {createDialog === "channel" && (
          <NewGroupDialog
            onOpenChange={handleCreateDialogOpenChange}
            onCreated={onSelectChannel}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
