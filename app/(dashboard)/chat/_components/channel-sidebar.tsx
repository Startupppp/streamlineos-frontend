"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareText, PanelLeftClose, Search, X } from "lucide-react";
import { EmptyMailIllustration } from "@/components/illustrations";
import { useChatChannels, useChatOnlineUsers } from "@/lib/hooks/trpc-hooks";
import type { Channel } from "./chat-types";
import { ChannelSidebarSection } from "./channel-sidebar-section";
import { ChannelItem } from "./channel-item";
import { NewDMDialog } from "./new-dm-dialog";
import { NewGroupDialog } from "./new-group-dialog";

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
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    () => filteredChannels.filter((c) => c.type === "GROUP"),
    [filteredChannels]
  );

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#bd882c] to-[#d4a544] flex items-center justify-center shadow-sm">
              <MessageSquareText className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Messages</h2>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {onlineUsers?.length ?? 0} online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
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
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-[13px] bg-muted/30 border-border/30 rounded-lg placeholder:text-muted-foreground/40"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
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
            {groups.length > 0 && (
              <ChannelSidebarSection
                title="Channels"
                count={groups.reduce((a, c) => a + c.unreadCount, 0)}
                collapsed={groupsCollapsed}
                onToggle={() => setGroupsCollapsed((p) => !p)}
              >
                {groups.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    isActive={activeChannelId === ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                  />
                ))}
              </ChannelSidebarSection>
            )}

            {dms.length > 0 && (
              <ChannelSidebarSection
                title="Direct Messages"
                count={dms.reduce((a, c) => a + c.unreadCount, 0)}
                collapsed={dmsCollapsed}
                onToggle={() => setDmsCollapsed((p) => !p)}
              >
                {dms.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    isActive={activeChannelId === ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
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
    </>
  );
}
