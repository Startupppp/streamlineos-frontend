"use client";

import { memo, useCallback } from "react";
import { ChannelItem } from "./channel-item";
import type { Channel } from "@/types/chat";

interface ChannelListEntryProps {
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
