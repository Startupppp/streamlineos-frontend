"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ChannelListEntry } from "./channel-list-entry";
import type { Channel } from "@/types/chat";

export const CHANNEL_SECTION_PAGE_SIZE = 30;

interface ChannelSectionListProps {
  channels: Channel[];
  label: string;
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
  compact?: boolean;
  className?: string;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}

/**
 * `useChatChannels` drains every cursor page into one array, so a member of many
 * channels holds all of them client-side, and the sidebar mounts each one twice
 * — once in the compact rail, once in its section. This renders a bounded slice
 * and reveals the rest on request, keeping list semantics and the true set size
 * on every row so a screen reader reports "3 of 214", not "3 of 30".
 */
export function ChannelSectionList({
  channels,
  label,
  activeChannelId,
  currentUserId,
  onlineUserIds,
  onSelectChannel,
  compact = false,
  className,
  onStartCall,
  onOpenSettings,
}: ChannelSectionListProps) {
  const [pagesShown, setPagesShown] = useState(1);

  const handleRevealMore = useCallback(() => setPagesShown((p) => p + 1), []);

  const total = channels.length;
  const visibleCount = Math.min(total, pagesShown * CHANNEL_SECTION_PAGE_SIZE);
  const hiddenCount = total - visibleCount;

  return (
    <>
      <div role="list" aria-label={label} className={className}>
        {channels.slice(0, visibleCount).map((ch, index) => (
          <div
            key={ch.id}
            role="listitem"
            aria-posinset={index + 1}
            aria-setsize={total}
            className={cn(compact && "shrink-0")}
          >
            <ChannelListEntry
              channel={ch}
              activeChannelId={activeChannelId}
              currentUserId={currentUserId}
              onlineUserIds={onlineUserIds}
              onSelectChannel={onSelectChannel}
              compact={compact}
              tabIndex={index === 0 ? 0 : -1}
              onStartCall={onStartCall}
              onOpenSettings={onOpenSettings}
            />
          </div>
        ))}
      </div>
      <InfiniteScrollSentinel
        hasNextPage={hiddenCount > 0}
        isFetchingNextPage={false}
        onLoadMore={handleRevealMore}
        label={`Load more ${label.toLowerCase()} (${visibleCount} of ${total})`}
        className={cn("py-1", compact && "w-auto")}
      />
    </>
  );
}
