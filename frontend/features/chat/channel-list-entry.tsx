"use client";

import { memo, useCallback } from "react";
import { ChannelItem } from "./channel-item";
import type { Channel } from "./chat-types";

export interface ChannelListEntryProps {
  channel: Channel;
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
  compact?: boolean;
  tabIndex?: number;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}

/**
 * Rendered twice per channel by the sidebar — once in the compact rail, once
 * in its section — and re-rendered by every keystroke in the channel search.
 * All of its props are referentially stable at the call site, so memo turns
 * 2N avoidable renders per keystroke into zero.
 */
export const ChannelListEntry = memo(function ChannelListEntry({
  channel: ch,
  activeChannelId,
  currentUserId,
  onlineUserIds,
  onSelectChannel,
  compact = false,
  tabIndex,
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
      tabIndex={tabIndex}
      onStartCall={onStartCall}
      onOpenSettings={onOpenSettings}
    />
  );
});
