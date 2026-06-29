"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Compass, MessageSquareText, PanelLeftClose, Search, X } from "lucide-react";
import { EmptyMailIllustration } from "@/components/illustrations";
import { useChatChannels, useChatOnlineUsers, useSetPresenceStatus } from "@/lib/api/hooks";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { Channel } from "./chat-types";
import { ChannelSidebarSection } from "./channel-sidebar-section";
import { ChannelItem } from "./channel-item";
import { NewDMDialog } from "./new-dm-dialog";
import { NewGroupDialog } from "./new-group-dialog";
import { BrowseChannelsDialog } from "./browse-channels-dialog";
import { ChatSearchDialog } from "./chat-search-dialog";

interface ChannelListEntryProps {
  channel: Channel;
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
}

function ChannelListEntry({ channel: ch, activeChannelId, currentUserId, onlineUserIds, onSelectChannel }: ChannelListEntryProps) {
  const handleClick = useCallback(() => onSelectChannel(ch.id), [ch.id, onSelectChannel]);
  return (
    <ChannelItem
      channel={ch}
      isActive={activeChannelId === ch.id}
      onClick={handleClick}
      currentUserId={currentUserId}
      onlineUserIds={onlineUserIds}
    />
  );
}

export function ChannelSidebar({
  activeChannelId,
  onSelectChannel,
  currentUserId,
  autoFocusSearch,
  onSearchFocused,
  onCollapse,
}: {
  activeChannelId: number | null;
  onSelectChannel: (id: number) => void;
  currentUserId: string;
  autoFocusSearch?: boolean;
  onSearchFocused?: () => void;
  onCollapse?: () => void;
}) {
  const { data: rawChannels, isLoading } = useChatChannels();
  const channels = rawChannels as Channel[] | undefined;
  const { data: onlineUsers } = useChatOnlineUsers();
  const [search, setSearch] = useState("");
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
  const [browseOpen, setBrowseOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const [publicCollapsed, setPublicCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleClearSearch = useCallback(() => setSearch(""), []);
  const handleToggleGroups = useCallback(() => setGroupsCollapsed((p) => !p), []);
  const handleToggleDMs = useCallback(() => setDmsCollapsed((p) => !p), []);
  const handleTogglePublic = useCallback(() => setPublicCollapsed((p) => !p), []);
  const handleOpenBrowse = useCallback(() => setBrowseOpen(true), []);

  useEffect(() => {
    if (autoFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      onSearchFocused?.();
    }
  }, [autoFocusSearch, onSearchFocused]);

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

  const dms = useMemo(
    () => filteredChannels.filter((c) => c.type === "DIRECT"),
    [filteredChannels]
  );

  const groups = useMemo(
    () => filteredChannels.filter((c) => c.type === "GROUP" || c.type === "PRIVATE"),
    [filteredChannels]
  );

  const publicChannels = useMemo(
    () => filteredChannels.filter((c) => c.type === "PUBLIC"),
    [filteredChannels]
  );

  return (
    <>
      <div className="px-4 pt-4 pb-2">
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
              onClick={() => setChatSearchOpen(true)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Search"
              title="Search"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleOpenBrowse}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Browse public channels"
              title="Browse Channels"
            >
              <Compass className="h-3.5 w-3.5" />
            </button>
            <NewDMDialog open={newDMOpen} onOpenChange={setNewDMOpen} onCreated={onSelectChannel} />
            <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} onCreated={onSelectChannel} />
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            ref={searchInputRef}
            placeholder="Search conversations..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8 h-8 text-[13px] bg-muted/30 border-border/30 rounded-lg placeholder:text-muted-foreground/40"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-1">
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
        )}
      </ScrollArea>

      <div className="px-3 py-2.5 border-t border-border/30 shrink-0">
        <div className="relative">
          <button
            onClick={handleToggleStatusMenu}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-muted/40 transition-colors"
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
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[12px] font-medium truncate">{session?.user?.name ?? "You"}</p>
              <p className="text-[10px] text-muted-foreground">{STATUS_OPTIONS.find(o => o.value === currentStatus)?.label ?? "Online"}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          </button>
          {showStatusMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-background border border-border/60 rounded-xl shadow-lg overflow-hidden z-30">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
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
      <BrowseChannelsDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        onSelectChannel={onSelectChannel}
      />
    </>
  );
}
