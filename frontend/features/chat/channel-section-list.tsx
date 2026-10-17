"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ChannelListEntry } from "./channel-list-entry";
import type { Channel } from "./chat-types";

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

  const handleShowMore = useCallback(() => setPagesShown((p) => p + 1), []);

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
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={handleShowMore}
          className="w-full rounded-lg px-2 py-1.5 text-left text-dense font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          {`Show ${Math.min(hiddenCount, CHANNEL_SECTION_PAGE_SIZE)} more ${label.toLowerCase()} (${visibleCount} of ${total})`}
        </button>
      ) : null}
    </>
  );
}
