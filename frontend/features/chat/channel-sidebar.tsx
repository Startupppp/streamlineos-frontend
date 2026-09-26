"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useChatChannels,
  useArchivedChannels,
  useChatOnlineUsers,
} from "@/hooks/api/chat-core-read";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ChannelSectionList } from "./channel-section-list";
import { ChatOverlayFallback } from "./chat-lazy-fallbacks";
import { ChannelCompactRail } from "./channel-compact-rail";
import { ChannelSidebarHeader } from "./channel-sidebar-header";
import { ChannelSidebarCollapseButton } from "./channel-sidebar-collapse-button";
import { ChannelInboxSections } from "./channel-inbox-sections";
import { ChannelSidebarSearchResults } from "./channel-sidebar-search-results";
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

interface ChannelSidebarProps {
  activeChannelId: number | null;
  onSelectChannel: (id: number) => void;
  currentUserId: string;
  autoFocusSearch?: boolean;
  onSearchFocused?: () => void;
  isCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}

export function ChannelSidebar({
  activeChannelId,
  onSelectChannel,
  currentUserId,
  autoFocusSearch,
  onSearchFocused,
  isCollapsed = false,
  onToggleSidebar,
  onStartCall,
  onOpenSettings,
}: ChannelSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inboxFilter = readChatInboxFilter(searchParams.get("inbox"));
  const canReadChannels = useCan("chat:channels:read");
  const {
    channels,
    isLoading,
    isError,
    refetch: refetchChannels,
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
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newDMOpen, setNewDMOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState<ChatSearchScope>("messages");
  const [searchFocused, setSearchFocused] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const [publicCollapsed, setPublicCollapsed] = useState(false);
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    [],
  );
  const handleClearSearch = useCallback(() => setSearch(""), []);
  const handleSearchScopeChange = useCallback((scope: ChatSearchScope) => {
    setSearchScope(scope);
  }, []);
  const handleSearchFocusChange = useCallback((focused: boolean) => {
    setSearchFocused(focused);
    if (!focused) setSearchScope("messages");
  }, []);
  const handleInboxFilterChange = useCallback(
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
  const handleClearFilters = useCallback(() => {
    setSearch("");
    const query = withChatInboxFilter(
      new URLSearchParams(searchParams.toString()),
      "all",
    );
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);
  const handleRetryChannels = useCallback(() => {
    refetchChannels();
  }, [refetchChannels]);
  const handleToggleGroups = useCallback(
    () => setGroupsCollapsed((p) => !p),
    [],
  );
  const handleToggleDMs = useCallback(() => setDmsCollapsed((p) => !p), []);
  const handleTogglePublic = useCallback(
    () => setPublicCollapsed((p) => !p),
    [],
  );
  const handleToggleFavorites = useCallback(
    () => setFavoritesCollapsed((p) => !p),
    [],
  );
  const handleOpenArchived = useCallback(() => setShowArchived(true), []);
  const handleCloseArchived = useCallback(() => {
    setShowArchived(false);
    setSearch("");
  }, []);
  const handleOpenBrowse = useCallback(
    () => router.push("/chat/channels"),
    [router],
  );
  const handleOpenChatSearch = useCallback(() => setChatSearchOpen(true), []);
  const handleOpenNewDM = useCallback(() => setNewDMOpen(true), []);
  const handleOpenNewGroup = useCallback(() => setNewGroupOpen(true), []);

  const showScopedSearch =
    searchFocused && !showArchived && searchScope !== "messages";

  useEffect(() => {
    if (autoFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      onSearchFocused?.();
    }
  }, [autoFocusSearch, onSearchFocused]);

  useEffect(() => {
    const handler = () => setChatSearchOpen(true);
    window.addEventListener("chat:open-search", handler);
    return () => window.removeEventListener("chat:open-search", handler);
  }, []);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers],
  );

  const filteredChannels = useMemo(() => {
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.lastMessage?.content?.toLowerCase().includes(q),
    );
  }, [channels, search]);

  const filteredArchivedChannels = useMemo(() => {
    if (!search) return archivedChannels;
    const q = search.toLowerCase();
    return archivedChannels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.lastMessage?.content?.toLowerCase().includes(q),
    );
  }, [archivedChannels, search]);

  const archivedUnreadCount = useMemo(
    () => archivedChannels.reduce((sum, ch) => sum + ch.unreadCount, 0),
    [archivedChannels],
  );

  const visibleChannels = useMemo(
    () =>
      filteredChannels.filter((channel) =>
        channelMatchesInboxFilter(channel, inboxFilter),
      ),
    [filteredChannels, inboxFilter],
  );

  const unreadTotal = useMemo(
    () => channels.reduce((sum, channel) => sum + channel.unreadCount, 0),
    [channels],
  );

  const inboxCounts = useMemo(
    () => countChatInboxFilters(filteredChannels),
    [filteredChannels],
  );

  const favorites = useMemo(
    () =>
      visibleChannels.filter(
        (c) => c.members?.find((m) => m.user?.id === currentUserId)?.isFavorite,
      ),
    [visibleChannels, currentUserId],
  );

  const favoriteIds = useMemo(
    () => new Set(favorites.map((c) => c.id)),
    [favorites],
  );

  const dms = useMemo(
    () =>
      visibleChannels.filter(
        (c) => c.type === "DIRECT" && !favoriteIds.has(c.id),
      ),
    [visibleChannels, favoriteIds],
  );

  const groups = useMemo(
    () =>
      visibleChannels.filter(
        (c) =>
          (c.type === "GROUP" || c.type === "PRIVATE") &&
          !favoriteIds.has(c.id),
      ),
    [visibleChannels, favoriteIds],
  );

  const publicChannels = useMemo(
    () =>
      visibleChannels.filter(
        (c) => c.type === "PUBLIC" && !favoriteIds.has(c.id),
      ),
    [visibleChannels, favoriteIds],
  );

  const compactChannels = useMemo(
    () => [...favorites, ...publicChannels, ...groups, ...dms],
    [favorites, publicChannels, groups, dms],
  );

  return (
    <TooltipProvider>
      <div className="relative flex h-full flex-col overflow-visible">
        {!isCollapsed && onToggleSidebar ? (
          <ChannelSidebarCollapseButton
            isCollapsed={false}
            onToggle={onToggleSidebar}
            className="absolute top-14 right-0 z-30 translate-x-1/2 border border-border/40 bg-card shadow-sm"
          />
        ) : null}

        <ChannelSidebarHeader
          isCollapsed={isCollapsed}
          onlineUserCount={onlineUsers?.length ?? 0}
          unreadTotal={unreadTotal}
          inboxFilter={inboxFilter}
          inboxCounts={inboxCounts}
          onInboxFilter={handleInboxFilterChange}
          search={search}
          showArchived={showArchived}
          searchScope={searchScope}
          searchInputRef={searchInputRef}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
          onSearchScopeChange={handleSearchScopeChange}
          onSearchFocusChange={handleSearchFocusChange}
          onOpenNewDM={handleOpenNewDM}
          onOpenNewGroup={handleOpenNewGroup}
        />

        <ChannelCompactRail
          isCollapsed={isCollapsed}
          onSearchOpen={handleOpenChatSearch}
          onBrowseOpen={handleOpenBrowse}
          onNewDMOpen={handleOpenNewDM}
          onNewGroupOpen={handleOpenNewGroup}
          onToggleSidebar={onToggleSidebar}
        />

        <ScrollArea
          className={cn("flex-1", isCollapsed ? "px-2 lg:px-1" : "px-2")}
        >
          {!canReadChannels ? (
            <NoPermissionState
              compact
              className="m-2"
              permission="chat:channels:read"
              description="You don’t have permission to see this workspace’s conversations."
            />
          ) : isError && !showArchived ? (
            <ErrorState
              compact
              className="m-2"
              title="Couldn't load your conversations"
              description="The channel list could not be read. Please try again."
              onRetry={handleRetryChannels}
            />
          ) : isLoading && !showArchived ? (
            <div className="space-y-2 p-3" aria-busy="true">
              <span role="status" className="sr-only">
                Loading conversations…
              </span>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex min-h-14 items-center gap-3 px-2 py-2"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div
                    className={cn(
                      "flex-1 space-y-1.5",
                      isCollapsed && "lg:hidden",
                    )}
                  >
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div onKeyDown={handleConversationListKeyDown}>
              <p className="sr-only">
                Use the arrow keys to move between conversations.
              </p>
              <div className={cn("hidden pb-1", isCollapsed && "lg:block")}>
                <ChannelSectionList
                  channels={compactChannels}
                  label="Conversations"
                  compact
                  className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  activeChannelId={activeChannelId}
                  currentUserId={currentUserId}
                  onlineUserIds={onlineUserIds}
                  onSelectChannel={onSelectChannel}
                />
              </div>
              {showScopedSearch ? (
                <div className={cn("pb-1", isCollapsed && "lg:hidden")}>
                  <ChannelSidebarSearchResults
                    scope={searchScope}
                    search={search}
                    channels={channels}
                    activeChannelId={activeChannelId}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                    onSelectChannel={onSelectChannel}
                    onStartCall={onStartCall}
                    onOpenSettings={onOpenSettings}
                  />
                </div>
              ) : (
                <ChannelInboxSections
                  inboxFilter={inboxFilter}
                  search={search}
                  isCollapsed={isCollapsed}
                  showArchived={showArchived}
                  favorites={favorites}
                  publicChannels={publicChannels}
                  groups={groups}
                  dms={dms}
                  favoritesCollapsed={favoritesCollapsed}
                  publicCollapsed={publicCollapsed}
                  groupsCollapsed={groupsCollapsed}
                  dmsCollapsed={dmsCollapsed}
                  onToggleFavorites={handleToggleFavorites}
                  onTogglePublic={handleTogglePublic}
                  onToggleGroups={handleToggleGroups}
                  onToggleDMs={handleToggleDMs}
                  archivedChannels={filteredArchivedChannels}
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
                  visibleCount={visibleChannels.length}
                  hasMoreChannels={hasMoreChannels}
                  channelsTruncated={channelsTruncated}
                  isLoadingMoreChannels={isLoadingMoreChannels}
                  onLoadMoreChannels={loadMoreChannels}
                  onClearFilters={handleClearFilters}
                />
              )}
            </div>
          )}
        </ScrollArea>

        {chatSearchOpen && (
          <ChatSearchDialog
            open
            onOpenChange={setChatSearchOpen}
            onSelectChannel={onSelectChannel}
          />
        )}
        {newDMOpen && (
          <NewDMDialog
            open
            onOpenChange={setNewDMOpen}
            onCreated={onSelectChannel}
            hideTrigger
          />
        )}
        {newGroupOpen && (
          <NewGroupDialog
            open
            onOpenChange={setNewGroupOpen}
            onCreated={onSelectChannel}
            hideTrigger
          />
        )}
      </div>
    </TooltipProvider>
  );
}
