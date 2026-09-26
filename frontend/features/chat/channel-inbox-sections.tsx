"use client";

import { Archive, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { cn } from "@/lib/utils";
import { ChannelArchivedSection } from "./channel-archived-section";
import { ChannelSectionList } from "./channel-section-list";
import { ChannelSidebarSection } from "./channel-sidebar-section";
import {
  inboxEmptyTitle,
  inboxStatusLabel,
  type ChatInboxFilter,
} from "./chat-inbox-filter";
import type { Channel } from "./chat-types";

interface ChannelInboxSectionsProps {
  inboxFilter: ChatInboxFilter;
  search: string;
  isCollapsed: boolean;
  showArchived: boolean;
  favorites: Channel[];
  publicChannels: Channel[];
  groups: Channel[];
  dms: Channel[];
  favoritesCollapsed: boolean;
  publicCollapsed: boolean;
  groupsCollapsed: boolean;
  dmsCollapsed: boolean;
  onToggleFavorites: () => void;
  onTogglePublic: () => void;
  onToggleGroups: () => void;
  onToggleDMs: () => void;
  archivedChannels: Channel[];
  archivedUnreadCount: number;
  isArchivedLoading: boolean;
  hasMoreArchived: boolean;
  isLoadingMoreArchived: boolean;
  onLoadMoreArchived: () => void;
  onOpenArchived: () => void;
  onCloseArchived: () => void;
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
  visibleCount: number;
  hasMoreChannels: boolean;
  channelsTruncated: boolean;
  isLoadingMoreChannels: boolean;
  onLoadMoreChannels: () => void;
  onClearFilters: () => void;
}

function unreadIn(channels: Channel[]): number {
  return channels.reduce((sum, channel) => sum + channel.unreadCount, 0);
}

export function ChannelInboxSections({
  inboxFilter,
  search,
  isCollapsed,
  showArchived,
  favorites,
  publicChannels,
  groups,
  dms,
  favoritesCollapsed,
  publicCollapsed,
  groupsCollapsed,
  dmsCollapsed,
  onToggleFavorites,
  onTogglePublic,
  onToggleGroups,
  onToggleDMs,
  archivedChannels,
  archivedUnreadCount,
  isArchivedLoading,
  hasMoreArchived,
  isLoadingMoreArchived,
  onLoadMoreArchived,
  onOpenArchived,
  onCloseArchived,
  activeChannelId,
  currentUserId,
  onlineUserIds,
  onSelectChannel,
  onStartCall,
  onOpenSettings,
  visibleCount,
  hasMoreChannels,
  channelsTruncated,
  isLoadingMoreChannels,
  onLoadMoreChannels,
  onClearFilters,
}: ChannelInboxSectionsProps) {
  const filtersActive = Boolean(search) || inboxFilter !== "all";
  const listProps = {
    activeChannelId,
    currentUserId,
    onlineUserIds,
    onSelectChannel,
    onStartCall,
    onOpenSettings,
  };

  if (showArchived) {
    return (
      <ChannelArchivedSection
        isLoading={isArchivedLoading}
        channels={archivedChannels}
        isCollapsed={isCollapsed}
        search={search}
        activeChannelId={activeChannelId}
        currentUserId={currentUserId}
        onlineUserIds={onlineUserIds}
        onSelectChannel={onSelectChannel}
        onClose={onCloseArchived}
        hasMore={hasMoreArchived}
        isLoadingMore={isLoadingMoreArchived}
        onLoadMore={onLoadMoreArchived}
        onStartCall={onStartCall}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  return (
    <div className={cn("py-1", isCollapsed && "lg:hidden")}>
      {visibleCount > 0 && (
        <p className="sr-only" role="status">
          {inboxStatusLabel(inboxFilter, visibleCount, Boolean(search))}
        </p>
      )}

      {favorites.length > 0 && (
        <ChannelSidebarSection
          title="Favorites"
          count={unreadIn(favorites)}
          collapsed={favoritesCollapsed}
          onToggle={onToggleFavorites}
          icon={<Star className="h-3 w-3 fill-amber-400 text-status-warning-ink" />}
        >
          <ChannelSectionList channels={favorites} label="Favorites" {...listProps} />
        </ChannelSidebarSection>
      )}

      {!search && inboxFilter === "all" && archivedChannels.length > 0 && (
        <button
          type="button"
          onClick={onOpenArchived}
          className="mb-1 flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60">
            <Archive className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="flex-1 text-label font-medium text-foreground">Archived</span>
          {archivedUnreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-micro font-bold tabular-nums text-primary-foreground">
              {archivedUnreadCount > 99 ? "99+" : archivedUnreadCount}
            </span>
          )}
        </button>
      )}

      {publicChannels.length > 0 && (
        <ChannelSidebarSection
          title="Public channels"
          count={unreadIn(publicChannels)}
          collapsed={publicCollapsed}
          onToggle={onTogglePublic}
        >
          <ChannelSectionList
            channels={publicChannels}
            label="Public channels"
            {...listProps}
          />
        </ChannelSidebarSection>
      )}

      {groups.length > 0 && (
        <ChannelSidebarSection
          title="Groups"
          count={unreadIn(groups)}
          collapsed={groupsCollapsed}
          onToggle={onToggleGroups}
        >
          <ChannelSectionList channels={groups} label="Groups" {...listProps} />
        </ChannelSidebarSection>
      )}

      {dms.length > 0 && (
        <ChannelSidebarSection
          title="Direct messages"
          count={unreadIn(dms)}
          collapsed={dmsCollapsed}
          onToggle={onToggleDMs}
        >
          <ChannelSectionList channels={dms} label="Direct messages" {...listProps} />
        </ChannelSidebarSection>
      )}

      {visibleCount === 0 && !hasMoreChannels && (
        <EmptyState
          compact
          illustrationPreset="mail"
          title="No conversations yet"
          description="Start a direct message or create a channel to begin."
          filtersActive={filtersActive}
          filteredTitle={inboxEmptyTitle(inboxFilter, Boolean(search))}
          onClearFilters={onClearFilters}
        />
      )}

      {channelsTruncated ? (
        <p role="status" className="px-2 py-1.5 text-dense text-muted-foreground">
          Showing the channels loaded so far. Search by name to reach the rest.
        </p>
      ) : (
        <InfiniteScrollSentinel
          hasNextPage={hasMoreChannels}
          isFetchingNextPage={isLoadingMoreChannels}
          onLoadMore={onLoadMoreChannels}
          label="Load more conversations"
        />
      )}
    </div>
  );
}
