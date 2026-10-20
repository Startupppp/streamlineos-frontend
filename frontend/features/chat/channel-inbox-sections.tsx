"use client";

import { Archive, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { cn } from "@/lib/utils";
import { ChannelArchivedSection } from "./channel-archived-section";
import { ChannelSectionList } from "./channel-section-list";
import {
  inboxEmptyTitle,
  inboxStatusLabel,
  type ChatInboxFilter,
} from "./chat-inbox-filter";
import type { Channel } from "@/types/chat";

interface ChannelInboxSectionsProps {
  inboxFilter: ChatInboxFilter;
  isCollapsed: boolean;
  showArchived: boolean;
  starred: Channel[];
  conversations: Channel[];
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
  hasMoreChannels: boolean;
  channelsTruncated: boolean;
  isLoadingMoreChannels: boolean;
  onLoadMoreChannels: () => void;
  onClearFilters: () => void;
}

const SECTION_HEADING_CLASS =
  "flex items-center gap-1 px-2 pt-2 pb-1 text-dense font-medium text-muted-foreground";

export function ChannelInboxSections({
  inboxFilter,
  isCollapsed,
  showArchived,
  starred,
  conversations,
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
  hasMoreChannels,
  channelsTruncated,
  isLoadingMoreChannels,
  onLoadMoreChannels,
  onClearFilters,
}: ChannelInboxSectionsProps) {
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
        search=""
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

  const visibleCount = starred.length + conversations.length;

  return (
    <div className={cn("pb-1", isCollapsed && "lg:hidden")}>
      {visibleCount > 0 && (
        <p className="sr-only" role="status">
          {inboxStatusLabel(inboxFilter, visibleCount, false)}
        </p>
      )}

      {starred.length > 0 && (
        <section aria-label="Starred" className="mb-1">
          <h3 className={SECTION_HEADING_CLASS}>
            <Star className="h-3 w-3 fill-amber-400 text-status-warning-ink" aria-hidden="true" />
            Starred
          </h3>
          <ChannelSectionList channels={starred} label="Starred" {...listProps} />
        </section>
      )}

      {conversations.length > 0 && (
        <section aria-label="Conversations">
          <h3 className={SECTION_HEADING_CLASS}>Conversations</h3>
          <ChannelSectionList
            channels={conversations}
            label="Conversations"
            {...listProps}
          />
        </section>
      )}

      {visibleCount === 0 && !hasMoreChannels && (
        <EmptyState
          compact
          illustrationPreset="mail"
          title="No conversations yet"
          description="Start a message or channel."
          filtersActive={inboxFilter !== "all"}
          filteredTitle={inboxEmptyTitle(inboxFilter, false)}
          onClearFilters={onClearFilters}
        />
      )}

      {channelsTruncated ? (
        <p role="status" className="px-2 py-1.5 text-dense text-muted-foreground">
          Showing the conversations loaded so far. Use search to reach the rest.
        </p>
      ) : (
        <InfiniteScrollSentinel
          hasNextPage={hasMoreChannels}
          isFetchingNextPage={isLoadingMoreChannels}
          onLoadMore={onLoadMoreChannels}
          label="Load more conversations"
        />
      )}

      {inboxFilter === "all" && archivedChannels.length > 0 && (
        <button
          type="button"
          onClick={onOpenArchived}
          className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <Archive className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-label font-medium">Archived</span>
          {archivedUnreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-micro font-bold tabular-nums text-primary-foreground">
              {archivedUnreadCount > 99 ? "99+" : archivedUnreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
