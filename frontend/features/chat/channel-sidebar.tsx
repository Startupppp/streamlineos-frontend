"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Archive,
  MessageSquareText,
  Star,
} from "lucide-react";
import {
  CompassIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { useRouter } from "next/navigation";
import {
  useChatChannels,
  useArchivedChannels,
  useChatOnlineUsers,
} from "@/hooks/api/chat-core-read";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ChannelSidebarSection } from "./channel-sidebar-section";
import { ChannelSectionList } from "./channel-section-list";
import { ChatOverlayFallback } from "./chat-lazy-fallbacks";
import { ChatSidebarNav } from "./chat-sidebar-nav";
import { ChannelCompactRail } from "./channel-compact-rail";
import { ChannelArchivedSection } from "./channel-archived-section";

const NewDMDialog = dynamic(
  () => import("./new-dm-dialog").then((m) => ({ default: m.NewDMDialog })),
  { ssr: false, loading: () => <ChatOverlayFallback label="Loading new message" /> },
);

const NewGroupDialog = dynamic(
  () =>
    import("./new-group-dialog").then((m) => ({ default: m.NewGroupDialog })),
  { ssr: false, loading: () => <ChatOverlayFallback label="Loading new channel" /> },
);

const ChatSearchDialog = dynamic(
  () =>
    import("./chat-search-dialog").then((m) => ({ default: m.ChatSearchDialog })),
  { ssr: false, loading: () => <ChatOverlayFallback label="Loading chat search" /> },
);

const RAIL_ICON_SIZE = 14;

const SidebarSearchButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function SidebarSearchButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <SearchIcon ref={iconRef} size={RAIL_ICON_SIZE} />
    </button>
  );
});

interface ChannelSidebarProps {
  activeChannelId: number | null;
  onSelectChannel: (id: number) => void;
  currentUserId: string;
  autoFocusSearch?: boolean;
  onSearchFocused?: () => void;
  isCollapsed?: boolean;
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
  onStartCall,
  onOpenSettings,
}: ChannelSidebarProps) {
  const router = useRouter();
  const { data: channels, isLoading, isError, refetch } = useChatChannels();
  const { data: archivedChannels, isLoading: isArchivedLoading } = useArchivedChannels();
  const { data: onlineUsers } = useChatOnlineUsers();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newDMOpen, setNewDMOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const [publicCollapsed, setPublicCollapsed] = useState(false);
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = useCallback((value: string) => setSearch(value), []);
  const handleClearSearch = useCallback(() => setSearch(""), []);
  const handleRetryChannels = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleToggleGroups = useCallback(() => setGroupsCollapsed((p) => !p), []);
  const handleToggleDMs = useCallback(() => setDmsCollapsed((p) => !p), []);
  const handleTogglePublic = useCallback(() => setPublicCollapsed((p) => !p), []);
  const handleToggleFavorites = useCallback(() => setFavoritesCollapsed((p) => !p), []);
  const handleOpenArchived = useCallback(() => setShowArchived(true), []);
  const handleCloseArchived = useCallback(() => {
    setShowArchived(false);
    setSearch("");
  }, []);
  const handleOpenBrowse = useCallback(() => router.push("/chat/channels"), [router]);
  const handleOpenChatSearch = useCallback(() => setChatSearchOpen(true), []);
  const handleOpenNewDM = useCallback(() => setNewDMOpen(true), []);
  const handleOpenNewGroup = useCallback(() => setNewGroupOpen(true), []);

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
    [onlineUsers]
  );

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.lastMessage?.content?.toLowerCase().includes(q)
    );
  }, [channels, search]);

  const filteredArchivedChannels = useMemo(() => {
    if (!archivedChannels) return [];
    if (!search) return archivedChannels;
    const q = search.toLowerCase();
    return archivedChannels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.lastMessage?.content?.toLowerCase().includes(q),
    );
  }, [archivedChannels, search]);

  const archivedUnreadCount = useMemo(
    () => (archivedChannels ?? []).reduce((sum, ch) => sum + ch.unreadCount, 0),
    [archivedChannels],
  );

  const favorites = useMemo(
    () =>
      filteredChannels.filter((c) =>
        c.members?.find((m) => m.user?.id === currentUserId)?.isFavorite,
      ),
    [filteredChannels, currentUserId],
  );

  const favoriteIds = useMemo(() => new Set(favorites.map((c) => c.id)), [favorites]);

  const dms = useMemo(
    () => filteredChannels.filter((c) => c.type === "DIRECT" && !favoriteIds.has(c.id)),
    [filteredChannels, favoriteIds]
  );

  const groups = useMemo(
    () =>
      filteredChannels.filter(
        (c) => (c.type === "GROUP" || c.type === "PRIVATE") && !favoriteIds.has(c.id),
      ),
    [filteredChannels, favoriteIds]
  );

  const publicChannels = useMemo(
    () => filteredChannels.filter((c) => c.type === "PUBLIC" && !favoriteIds.has(c.id)),
    [filteredChannels, favoriteIds]
  );

  const compactChannels = useMemo(
    () => [...favorites, ...publicChannels, ...groups, ...dms],
    [favorites, publicChannels, groups, dms]
  );

  return (
    <TooltipProvider>
      <div className="relative flex flex-col h-full overflow-visible">
        <ChatSidebarNav isCollapsed={isCollapsed} />

        <div className={cn("px-4 pt-3 pb-2", isCollapsed && "md:hidden")}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <MessageSquareText className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">Messages</h2>
                <p className="text-dense text-muted-foreground leading-tight">
                  {onlineUsers?.length ?? 0} online
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-0.5 sm:flex">
              <SidebarSearchButton
                type="button"
                onClick={handleOpenChatSearch}
                className="w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Search"
                title="Search"
              />
              <button
                type="button"
                onClick={handleOpenBrowse}
                className="w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Browse public channels"
                title="Browse Channels"
              >
                <CompassIcon size={RAIL_ICON_SIZE} />
              </button>
              <AnimatedIconButton
                icon={PlusIcon}
                iconSize={RAIL_ICON_SIZE}
                variant="ghost"
                size="icon"
                className="w-7 rounded-lg"
                onClick={handleOpenNewDM}
                title="New Direct Message"
                aria-label="New Direct Message"
              />
              <AnimatedIconButton
                icon={UsersIcon}
                iconSize={RAIL_ICON_SIZE}
                variant="ghost"
                size="icon"
                className="w-7 rounded-lg"
                onClick={handleOpenNewGroup}
                title="New Channel"
                aria-label="New Channel"
              />
            </div>
          </div>

          <SearchInput
            ref={searchInputRef}
            placeholder={showArchived ? "Search archived chats..." : "Search conversations..."}
            value={search}
            onValueChange={handleSearchChange}
            onClear={handleClearSearch}
            inputClassName="bg-muted/30 border-border/30 rounded-lg placeholder:text-muted-foreground/40"
          />
        </div>

        <ChannelCompactRail
          isCollapsed={isCollapsed}
          onSearchOpen={handleOpenChatSearch}
          onBrowseOpen={handleOpenBrowse}
          onNewDMOpen={handleOpenNewDM}
          onNewGroupOpen={handleOpenNewGroup}
        />

        <ScrollArea className={cn("flex-1", isCollapsed ? "md:px-1 px-2" : "px-2")}>
          {showArchived ? (
            <ChannelArchivedSection
              isLoading={isArchivedLoading}
              channels={filteredArchivedChannels}
              isCollapsed={isCollapsed}
              search={search}
              activeChannelId={activeChannelId}
              currentUserId={currentUserId}
              onlineUserIds={onlineUserIds}
              onSelectChannel={onSelectChannel}
              onClose={handleCloseArchived}
              onStartCall={onStartCall}
              onOpenSettings={onOpenSettings}
            />
          ) : isError ? (
            <ErrorState
              compact
              className="m-2"
              title="Couldn't load your conversations"
              description="The channel list could not be read. Please try again."
              onRetry={handleRetryChannels}
            />
          ) : isLoading ? (
            <div className="p-3 space-y-2" aria-busy="true">
              <span role="status" className="sr-only">Loading conversations…</span>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className={cn("flex-1 space-y-1.5", isCollapsed && "md:hidden")}>
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className={cn("py-1", isCollapsed && "hidden md:block")}>
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

              <div className={cn("py-1", isCollapsed && "md:hidden")}>
                {favorites.length > 0 && (
                  <ChannelSidebarSection
                    title="Favorites"
                    count={favorites.reduce((a, c) => a + c.unreadCount, 0)}
                    collapsed={favoritesCollapsed}
                    onToggle={handleToggleFavorites}
                    icon={<Star className="h-3 w-3 fill-amber-400 text-status-warning-ink" />}
                  >
                    <ChannelSectionList
                      channels={favorites}
                      label="Favorites"
                      activeChannelId={activeChannelId}
                      currentUserId={currentUserId}
                      onlineUserIds={onlineUserIds}
                      onSelectChannel={onSelectChannel}
                      onStartCall={onStartCall}
                      onOpenSettings={onOpenSettings}
                    />
                  </ChannelSidebarSection>
                )}
              </div>

              <div className={cn("py-1", isCollapsed && "md:hidden")}>
                {!search && (archivedChannels?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenArchived}
                    className="w-full flex items-center gap-2.5 px-2 py-2.5 mb-1 rounded-xl text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-label font-medium text-foreground">Archived</span>
                    {archivedUnreadCount > 0 && (
                      <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-primary text-primary-foreground text-micro font-bold rounded-full px-1 shrink-0">
                        {archivedUnreadCount > 99 ? "99+" : archivedUnreadCount}
                      </span>
                    )}
                  </button>
                )}

                {publicChannels.length > 0 && (
                  <ChannelSidebarSection
                    title="Public Channels"
                    count={publicChannels.reduce((a, c) => a + c.unreadCount, 0)}
                    collapsed={publicCollapsed}
                    onToggle={handleTogglePublic}
                  >
                    <ChannelSectionList
                      channels={publicChannels}
                      label="Public channels"
                      activeChannelId={activeChannelId}
                      currentUserId={currentUserId}
                      onlineUserIds={onlineUserIds}
                      onSelectChannel={onSelectChannel}
                      onStartCall={onStartCall}
                      onOpenSettings={onOpenSettings}
                    />
                  </ChannelSidebarSection>
                )}

                {groups.length > 0 && (
                  <ChannelSidebarSection
                    title="Groups"
                    count={groups.reduce((a, c) => a + c.unreadCount, 0)}
                    collapsed={groupsCollapsed}
                    onToggle={handleToggleGroups}
                  >
                    <ChannelSectionList
                      channels={groups}
                      label="Groups"
                      activeChannelId={activeChannelId}
                      currentUserId={currentUserId}
                      onlineUserIds={onlineUserIds}
                      onSelectChannel={onSelectChannel}
                      onStartCall={onStartCall}
                      onOpenSettings={onOpenSettings}
                    />
                  </ChannelSidebarSection>
                )}

                {dms.length > 0 && (
                  <ChannelSidebarSection
                    title="Direct Messages"
                    count={dms.reduce((a, c) => a + c.unreadCount, 0)}
                    collapsed={dmsCollapsed}
                    onToggle={handleToggleDMs}
                  >
                    <ChannelSectionList
                      channels={dms}
                      label="Direct messages"
                      activeChannelId={activeChannelId}
                      currentUserId={currentUserId}
                      onlineUserIds={onlineUserIds}
                      onSelectChannel={onSelectChannel}
                      onStartCall={onStartCall}
                      onOpenSettings={onOpenSettings}
                    />
                  </ChannelSidebarSection>
                )}

                {filteredChannels.length === 0 && (
                  <EmptyState
                    compact
                    illustrationPreset="mail"
                    title="No conversations yet"
                    description="Start a direct message or create a channel to begin."
                    filtersActive={Boolean(search)}
                    filteredTitle="No conversations match your search."
                    onClearFilters={handleClearSearch}
                  />
                )}
              </div>
            </>
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
