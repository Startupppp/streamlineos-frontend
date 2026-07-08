"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Compass,
  MessageSquareText,
  Search,
  Star,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyMailIllustration } from "@/components/illustrations";
import { useChatChannels, useArchivedChannels, useChatOnlineUsers, useSetPresenceStatus } from "@/hooks/api";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { Channel } from "./chat-types";
import { ChannelSidebarSection } from "./channel-sidebar-section";
import { ChannelItem } from "./channel-item";
import { NewDMDialog } from "./new-dm-dialog";
import { NewGroupDialog } from "./new-group-dialog";
import { ChatSearchDialog } from "./chat-search-dialog";

interface ChannelListEntryProps {
  channel: Channel;
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
  compact?: boolean;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}

function ChannelListEntry({
  channel: ch,
  activeChannelId,
  currentUserId,
  onlineUserIds,
  onSelectChannel,
  compact = false,
  onStartCall,
  onOpenSettings,
}: ChannelListEntryProps) {
  const handleClick = useCallback(() => onSelectChannel(ch.id), [ch.id, onSelectChannel]);
  return (
    <ChannelItem
      channel={ch}
      isActive={activeChannelId === ch.id}
      onClick={handleClick}
      currentUserId={currentUserId}
      onlineUserIds={onlineUserIds}
      compact={compact}
      onStartCall={onStartCall}
      onOpenSettings={onOpenSettings}
    />
  );
}

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
  const { data: rawChannels, isLoading } = useChatChannels();
  const channels = rawChannels as Channel[] | undefined;
  const { data: rawArchivedChannels, isLoading: isArchivedLoading } = useArchivedChannels();
  const archivedChannels = rawArchivedChannels as Channel[] | undefined;
  const { data: onlineUsers } = useChatOnlineUsers();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newDMOpen, setNewDMOpen] = useState(false);
  const { data: session } = useSession();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const setStatus = useSetPresenceStatus();
  const [currentStatus, setCurrentStatus] = useState<"ONLINE" | "AWAY" | "BUSY" | "INVISIBLE">("ONLINE");

  const STATUS_OPTIONS = [
    { value: "ONLINE" as const, label: "Online", color: "bg-emerald-500" },
    { value: "AWAY" as const, label: "Away", color: "bg-yellow-400" },
    { value: "BUSY" as const, label: "Busy", color: "bg-red-500" },
    { value: "INVISIBLE" as const, label: "Invisible", color: "bg-zinc-400" },
  ];

  const handleSelectStatus = useCallback((value: "ONLINE" | "AWAY" | "BUSY" | "INVISIBLE") => {
    setCurrentStatus(value);
    setShowStatusMenu(false);
    setStatus.mutate(value);
  }, [setStatus]);

  const handleToggleStatusMenu = useCallback(() => setShowStatusMenu((p) => !p), []);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const [publicCollapsed, setPublicCollapsed] = useState(false);
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleClearSearch = useCallback(() => setSearch(""), []);
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

  function renderCompactActionButton(
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
  ) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={label}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative flex flex-col h-full overflow-visible">
        <div className={cn("px-4 pt-4 pb-2", isCollapsed && "md:hidden")}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
                <MessageSquareText className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">Messages</h2>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {onlineUsers?.length ?? 0} online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleOpenChatSearch}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Search"
                title="Search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleOpenBrowse}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Browse public channels"
                title="Browse Channels"
              >
                <Compass className="h-3.5 w-3.5" />
              </button>
              <NewDMDialog open={newDMOpen} onOpenChange={setNewDMOpen} onCreated={onSelectChannel} />
              <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} onCreated={onSelectChannel} />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              ref={searchInputRef}
              placeholder={showArchived ? "Search archived chats..." : "Search conversations..."}
              value={search}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-[13px] bg-muted/30 border-border/30 rounded-lg placeholder:text-muted-foreground/40"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div
          className={cn(
            "relative z-20 hidden flex-col items-center gap-2 px-1.5 pt-4 pb-2 shrink-0",
            isCollapsed && "md:flex",
          )}
        >
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
                <MessageSquareText className="h-4 w-4 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
              Messages
            </TooltipContent>
          </Tooltip>
          <div className="flex flex-col items-center gap-0.5">
            {renderCompactActionButton("Search", <Search className="h-3.5 w-3.5" />, handleOpenChatSearch)}
            {renderCompactActionButton("Browse Channels", <Compass className="h-3.5 w-3.5" />, handleOpenBrowse)}
          </div>
          <NewDMDialog open={newDMOpen} onOpenChange={setNewDMOpen} onCreated={onSelectChannel} />
          <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} onCreated={onSelectChannel} />
        </div>

        <ScrollArea className={cn("flex-1", isCollapsed ? "md:px-1 px-2" : "px-2")}>
          {showArchived ? (
            <div className={cn("py-1", isCollapsed && "md:hidden")}>
              <button
                type="button"
                onClick={handleCloseArchived}
                className="w-full flex items-center gap-2 px-2 py-2 mb-1 rounded-xl text-left hover:bg-muted/40 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-[13px] font-semibold text-foreground">Archived</span>
              </button>

              {isArchivedLoading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredArchivedChannels.length > 0 ? (
                filteredArchivedChannels.map((ch) => (
                  <ChannelListEntry
                    key={ch.id}
                    channel={ch}
                    activeChannelId={activeChannelId}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                    onSelectChannel={onSelectChannel}
                    onStartCall={onStartCall}
                    onOpenSettings={onOpenSettings}
                  />
                ))
              ) : (
                <div className="text-center py-10 px-4">
                  <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] text-muted-foreground font-medium">
                    {search ? "No archived chats found" : "No archived chats"}
                  </p>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="p-3 space-y-2">
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
              <div className={cn("py-1 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 [&>*]:shrink-0", isCollapsed && "hidden md:block")}>
                {compactChannels.map((ch) => (
                  <ChannelListEntry
                    key={ch.id}
                    channel={ch}
                    activeChannelId={activeChannelId}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                    onSelectChannel={onSelectChannel}
                    compact
                  />
                ))}
              </div>

              <div className={cn("py-1", isCollapsed && "md:hidden")}>
                {favorites.length > 0 && (
                  <ChannelSidebarSection
                    title="Favorites"
                    count={favorites.reduce((a, c) => a + c.unreadCount, 0)}
                    collapsed={favoritesCollapsed}
                    onToggle={handleToggleFavorites}
                    icon={<Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                  >
                    {favorites.map((ch) => (
                      <ChannelListEntry
                        key={ch.id}
                        channel={ch}
                        activeChannelId={activeChannelId}
                        currentUserId={currentUserId}
                        onlineUserIds={onlineUserIds}
                        onSelectChannel={onSelectChannel}
                        onStartCall={onStartCall}
                        onOpenSettings={onOpenSettings}
                      />
                    ))}
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
                    <span className="flex-1 text-[13px] font-medium text-foreground">Archived</span>
                    {archivedUnreadCount > 0 && (
                      <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full px-1 shrink-0">
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
                    {publicChannels.map((ch) => (
                      <ChannelListEntry
                        key={ch.id}
                        channel={ch}
                        activeChannelId={activeChannelId}
                        currentUserId={currentUserId}
                        onlineUserIds={onlineUserIds}
                        onSelectChannel={onSelectChannel}
                        onStartCall={onStartCall}
                        onOpenSettings={onOpenSettings}
                      />
                    ))}
                  </ChannelSidebarSection>
                )}

                {groups.length > 0 && (
                  <ChannelSidebarSection
                    title="Groups"
                    count={groups.reduce((a, c) => a + c.unreadCount, 0)}
                    collapsed={groupsCollapsed}
                    onToggle={handleToggleGroups}
                  >
                    {groups.map((ch) => (
                      <ChannelListEntry
                        key={ch.id}
                        channel={ch}
                        activeChannelId={activeChannelId}
                        currentUserId={currentUserId}
                        onlineUserIds={onlineUserIds}
                        onSelectChannel={onSelectChannel}
                        onStartCall={onStartCall}
                        onOpenSettings={onOpenSettings}
                      />
                    ))}
                  </ChannelSidebarSection>
                )}

                {dms.length > 0 && (
                  <ChannelSidebarSection
                    title="Direct Messages"
                    count={dms.reduce((a, c) => a + c.unreadCount, 0)}
                    collapsed={dmsCollapsed}
                    onToggle={handleToggleDMs}
                  >
                    {dms.map((ch) => (
                      <ChannelListEntry
                        key={ch.id}
                        channel={ch}
                        activeChannelId={activeChannelId}
                        currentUserId={currentUserId}
                        onlineUserIds={onlineUserIds}
                        onSelectChannel={onSelectChannel}
                        onStartCall={onStartCall}
                        onOpenSettings={onOpenSettings}
                      />
                    ))}
                  </ChannelSidebarSection>
                )}

                {filteredChannels.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <EmptyMailIllustration className="mx-auto mb-4 w-32 h-32" />
                    <p className="text-[13px] text-muted-foreground font-medium">
                      {search ? "No results found" : "No conversations yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1">
                      {search ? "Try a different search" : "Start a new conversation"}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </ScrollArea>

        <div className={cn("px-3 py-2.5 border-t border-border/30 shrink-0", isCollapsed && "md:px-1.5")}>
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleStatusMenu}
              className={cn(
                "w-full flex items-center rounded-xl hover:bg-muted/40 transition-colors",
                isCollapsed ? "md:justify-center md:px-1 md:py-1.5 gap-2.5 px-2 py-1.5" : "gap-2.5 px-2 py-1.5",
              )}
              aria-label="Set status"
            >
              <div className="relative shrink-0">
                <Avatar className="h-7 w-7 border border-border/30">
                  <AvatarImage src={resolveImageUrl(session?.user?.image)} />
                  <AvatarFallback className="text-[9px] font-semibold bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600">
                    {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", STATUS_OPTIONS.find(o => o.value === currentStatus)?.color ?? "bg-emerald-500")} />
              </div>
              <div className={cn("flex-1 min-w-0 text-left", isCollapsed && "md:hidden")}>
                <p className="text-[12px] font-medium truncate">{session?.user?.name ?? "You"}</p>
                <p className="text-[10px] text-muted-foreground">{STATUS_OPTIONS.find(o => o.value === currentStatus)?.label ?? "Online"}</p>
              </div>
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground/50 shrink-0", isCollapsed && "md:hidden")} />
            </button>
            {showStatusMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-background border border-border/60 rounded-xl shadow-lg overflow-hidden z-30">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectStatus(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors text-[12px]",
                      currentStatus === opt.value && "bg-muted/30 font-medium"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", opt.color)} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <ChatSearchDialog
          open={chatSearchOpen}
          onOpenChange={setChatSearchOpen}
          onSelectChannel={onSelectChannel}
        />
      </div>
    </TooltipProvider>
  );
}
